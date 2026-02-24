import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/http";
import { useBankroll } from "../context/BankrollContext";
import ui from "../styles/ui.module.css";
import ProfitChart from "../components/ProfitChart";

function localTodayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function minutesBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = Math.round((b - a) / 60000);
  return mins >= 0 ? mins : null;
}

function parseBigBlind(stakeStr) {
  if (!stakeStr) return null;
  const m = String(stakeStr).match(/(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)/);
  if (!m) return null;
  const bb = Number(m[3]);
  return Number.isFinite(bb) && bb > 0 ? bb : null;
}

function profitForSession(s) {
  const bi = Number(s.buyIn ?? 0);
  if (s.type === "CASH") return Number(s.cashOut ?? 0) - bi;
  return Number(s.winnings ?? 0) - (bi + Number(s.fee ?? 0) + Number(s.rebuys ?? 0) + Number(s.addons ?? 0));
}

/**
 * Use startTime when present. Otherwise treat `date` as date-only (prevents day-shift).
 */
function getSessionLocalDateObject(s) {
  if (s?.startTime) {
    const d = new Date(s.startTime);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (s?.date) {
    const iso = new Date(s.date).toISOString().slice(0, 10); // "YYYY-MM-DD"
    const [y, m, d] = iso.split("-").map(Number);
    const local = new Date(y, m - 1, d);
    if (!Number.isNaN(local.getTime())) return local;
  }
  if (s?.createdAt) {
    const d = new Date(s.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Create a UTC date bucket key (returned as Date object) for recharts.
 */
function toBucketUTCDate(dateObj, bucket) {
  const d = new Date(dateObj);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  if (bucket === "year") {
    return new Date(Date.UTC(y, 0, 1));
  }

  if (bucket === "month") {
    return new Date(Date.UTC(y, m, 1));
  }

  if (bucket === "week") {
    // week starts Monday (ISO-ish) in UTC
    const dow = d.getUTCDay(); // 0=Sun..6=Sat
    const offsetToMonday = (dow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
    const monday = new Date(Date.UTC(y, m, day));
    monday.setUTCDate(monday.getUTCDate() - offsetToMonday);
    return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
  }

  // day
  return new Date(Date.UTC(y, m, day));
}

const DOW = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function DashboardPage() {
  const { activeBankrollId, activeBankroll } = useBankroll();

  const [bucket, setBucket] = useState("day");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // display mode for hourly
  const [rateMode, setRateMode] = useState("usd"); // "usd" | "bb"

  // Filters (same style as SessionsPage)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [types, setTypes] = useState([]); // ["CASH","TOURNEY"]
  const [gamesSel, setGamesSel] = useState([]);
  const [stakesSel, setStakesSel] = useState([]);
  const [locationsSel, setLocationsSel] = useState([]);
  const [daysSel, setDaysSel] = useState([]);
  const [resultsSel, setResultsSel] = useState([]); // ["WIN","LOSS","EVEN"]
  const [query, setQuery] = useState("");

  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // options from user preferences (available on the bankroll context? not here)
  // We’ll build options from the sessions we have for this bankroll to avoid relying on user context.
  const gameOptions = useMemo(() => {
    const set = new Set();
    for (const s of sessions) if (s.game) set.add(s.game);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const stakeOptions = useMemo(() => {
    const set = new Set();
    for (const s of sessions) {
      const st = s.stake || s.stakes;
      if (st) set.add(st);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const locationOptions = useMemo(() => {
    const set = new Set();
    for (const s of sessions) if (s.location) set.add(s.location);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  async function loadSessions() {
    if (!activeBankrollId) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiFetch(`/api/sessions?bankrollId=${encodeURIComponent(activeBankrollId)}`);
      const list = data.entries ?? data.sessions ?? [];
      setSessions(list);

      // default start to earliest session date, end to today — only if not set
      let earliestMs = null;
      for (const s of list) {
        const d = getSessionLocalDateObject(s);
        if (!d) continue;
        const ms = d.getTime();
        if (!Number.isFinite(ms)) continue;
        if (earliestMs == null || ms < earliestMs) earliestMs = ms;
      }

      const today = localTodayYYYYMMDD();
      if (!end) setEnd(today);

      if (!start && earliestMs != null) {
        const ed = new Date(earliestMs);
        const y = ed.getFullYear();
        const m = String(ed.getMonth() + 1).padStart(2, "0");
        const dd = String(ed.getDate()).padStart(2, "0");
        setStart(`${y}-${m}-${dd}`);
      }
    } catch (e) {
      setSessions([]);
      setError(e.message || "Failed to load sessions");
      if (!end) setEnd(localTodayYYYYMMDD());
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // reset per-bankroll
    setSessions([]);
    setError("");
    setStart("");
    setEnd("");
    setRateMode("usd");

    setTypes([]);
    setGamesSel([]);
    setStakesSel([]);
    setLocationsSel([]);
    setDaysSel([]);
    setResultsSel([]);
    setQuery("");

    if (activeBankrollId) loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBankrollId]);

  function clearFilters() {
    setTypes([]);
    setGamesSel([]);
    setStakesSel([]);
    setLocationsSel([]);
    setDaysSel([]);
    setResultsSel([]);
    setQuery("");
  }

  const anyFiltersActive =
    types.length ||
    gamesSel.length ||
    stakesSel.length ||
    locationsSel.length ||
    daysSel.length ||
    resultsSel.length ||
    query.trim().length;

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();

    const startMs = start ? new Date(`${start}T00:00:00`).getTime() : null;
    const endMs = end ? new Date(`${end}T23:59:59`).getTime() : null;

    return (sessions || []).filter((s) => {
      const dateObj = getSessionLocalDateObject(s);
      if (!dateObj) return false;

      const ms = dateObj.getTime();
      if (startMs != null && ms < startMs) return false;
      if (endMs != null && ms > endMs) return false;

      if (types.length && !types.includes(s.type)) return false;

      const g = (s.game || "").trim();
      if (gamesSel.length && !gamesSel.some((x) => x.toLowerCase() === g.toLowerCase())) return false;

      const st = (s.stake || s.stakes || "").trim();
      if (stakesSel.length && !stakesSel.some((x) => x.toLowerCase() === st.toLowerCase())) return false;

      const loc = (s.location || "").trim();
      if (locationsSel.length && !locationsSel.some((x) => x.toLowerCase() === loc.toLowerCase())) return false;

      if (daysSel.length) {
        const dow = dateObj.getDay();
        if (!daysSel.includes(dow)) return false;
      }

      const profit = profitForSession(s);
      if (resultsSel.length) {
        const bucket = profit > 0 ? "WIN" : profit < 0 ? "LOSS" : "EVEN";
        if (!resultsSel.includes(bucket)) return false;
      }

      if (q) {
                const resultLabel = profit > 0 ? "win" : profit < 0 ? "loss" : "even";

        // ✅ add day-of-week tokens for search ("monday", "mon", etc.)
        const dayObj = dateObj; 
        const dayLong = dayObj
          ? dayObj.toLocaleDateString(undefined, { weekday: "long" }).toLowerCase()
          : "";
        const dayShort = dayObj
          ? dayObj.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase()
          : "";

        const hay = [
          s.game,
          st,
          s.location,
          s.notes,
          s.type,
          resultLabel,
          dayLong,
          dayShort,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [sessions, start, end, types, gamesSel, stakesSel, locationsSel, daysSel, resultsSel, query]);

  // Summary cards derived from filtered sessions
  const summary = useMemo(() => {
    const startingBankroll = Number(activeBankroll?.startingBankroll ?? 0);
    const currency = activeBankroll?.currency || "";
    const bankrollName = activeBankroll?.name || "";

    let totalProfit = 0;
    let totalCount = 0;

    let cashProfit = 0;
    let cashMinutes = 0;
    let cashCount = 0;

    let tourneyProfit = 0;
    let tourneyCostSum = 0;
    let tourneyCount = 0;

    let totalMinutesAll = 0;

    // BB/hr computation (cash only)
    let totalBBWon = 0;

    let wins = 0;

    for (const s of filteredSessions) {
      const profit = profitForSession(s);
      totalProfit += profit;
      totalCount += 1;
      if (profit > 0) wins += 1;

      const mins =
        s.durationMinutes != null ? Number(s.durationMinutes) : minutesBetween(s.startTime, s.endTime);

      if (Number.isFinite(mins) && mins > 0) totalMinutesAll += mins;

      if (s.type === "CASH") {
        cashProfit += profit;
        cashCount += 1;
        if (Number.isFinite(mins) && mins > 0) cashMinutes += mins;

        const st = s.stake || s.stakes || "";
        const bb = parseBigBlind(st);
        if (bb && Number.isFinite(mins) && mins > 0) totalBBWon += profit / bb;
      } else if (s.type === "TOURNEY") {
        tourneyProfit += profit;
        tourneyCount += 1;
        const cost = Number(s.buyIn ?? 0) + Number(s.fee ?? 0) + Number(s.rebuys ?? 0) + Number(s.addons ?? 0);
        tourneyCostSum += cost;
      }
    }

    const bankrollTotal = startingBankroll + totalProfit;

    const cashHours = cashMinutes / 60;
    const cashHourlyUSD = cashHours > 0 ? cashProfit / cashHours : null;
    const cashHourlyBB = cashHours > 0 ? totalBBWon / cashHours : null;

    const tourneyROI = tourneyCostSum > 0 ? tourneyProfit / tourneyCostSum : null;

    const totalHoursAll = totalMinutesAll / 60;
    const dollarsPerSession = totalCount > 0 ? totalProfit / totalCount : null;
    const winPct = totalCount > 0 ? (wins / totalCount) * 100 : null;

    return {
      bankrollName,
      currency,
      startingBankroll,
      bankroll: bankrollTotal,
      totalProfit,
      counts: { entries: totalCount, cash: cashCount, tourney: tourneyCount },
      cash: { profit: cashProfit, hours: cashHours, hourlyUSD: cashHourlyUSD, hourlyBB: cashHourlyBB },
      tourney: { profit: tourneyProfit, cost: tourneyCostSum, roi: tourneyROI },
      derived: {
        totalMinutesAll,
        totalHoursAll,
        dollarsPerSession,
        winPct,
      },
    };
  }, [filteredSessions, activeBankroll]);

  // Chart series derived from filtered sessions (bucketed)
  const series = useMemo(() => {
    const map = new Map(); // key: bucketDate.getTime(), value: profit sum

    for (const s of filteredSessions) {
      const dateObj = getSessionLocalDateObject(s);
      if (!dateObj) continue;
      const bucketDate = toBucketUTCDate(dateObj, bucket);
      const key = bucketDate.getTime();
      const profit = profitForSession(s);
      map.set(key, (map.get(key) || 0) + profit);
    }

    const keys = Array.from(map.keys()).sort((a, b) => a - b);
    let cumulative = 0;

    return keys.map((k) => {
      const profit = map.get(k) || 0;
      cumulative += profit;
      return { date: new Date(k), profit, cumulative };
    });
  }, [filteredSessions, bucket]);

  const hourlyDisplay =
    rateMode === "usd"
      ? summary.cash.hourlyUSD == null
        ? "—"
        : `${summary.cash.hourlyUSD.toFixed(2)} ${summary.currency}/hr`
      : summary.cash.hourlyBB == null
        ? "—"
        : `${summary.cash.hourlyBB.toFixed(2)} BB/hr`;

  const totalTimePlayedText =
    summary.derived.totalMinutesAll > 0
      ? `${Math.floor(summary.derived.totalMinutesAll / 60)}h ${Math.round(summary.derived.totalMinutesAll % 60)}m`
      : "—";

  const perSessionText =
    summary.derived.dollarsPerSession == null
      ? "—"
      : `${summary.derived.dollarsPerSession.toFixed(2)} ${summary.currency}/session`;

  const winPctText =
    summary.derived.winPct == null ? "—" : `${summary.derived.winPct.toFixed(1)}%`;

  // color coding
  const winPctGood = summary.derived.winPct != null && summary.derived.winPct >= 50;
  const roiGood = summary.tourney.roi != null && summary.tourney.roi >= 0; // profit/cost >=0 (break-even+)

  return (
    <div className={`${ui.page} ${ui.narrowPage}`}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Dashboard</h1>
        <button className={ui.button} onClick={loadSessions} disabled={busy || !activeBankrollId}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {activeBankroll && (
        <div className={ui.subtle}>
          Viewing <strong>{activeBankroll.name}</strong> ({activeBankroll.currency})
        </div>
      )}

      <div className={ui.controls}>
        <label className={ui.field}>
          <span className={ui.label}>Bucket</span>
          <select className={ui.select} value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Start</span>
          <input className={ui.input} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>End</span>
          <input className={ui.input} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>

        <button className={ui.button} type="button" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {error && <div className={ui.errorBanner}>{error}</div>}

      {/* ✅ Sessions Filters (placed under range controls, above cards) */}
      <div className={ui.panel} style={{ marginTop: 14 }}>
        <button
          type="button"
          className={ui.collapseHeader}
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <div className={ui.collapseTitleRow}>
            <span className={ui.sectionTitleText}>Session Filters</span>
            {Boolean(anyFiltersActive) ? <span className={ui.badge}>Active</span> : null}
          </div>

          <span className={ui.collapseChevron} aria-hidden="true">
            {filtersOpen ? "▾" : "▸"}
          </span>
        </button>

        <br />

        {/* Search stays visible */}
        <label className={ui.field}>
          <span className={ui.label}>Search</span>
          <input
            className={ui.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='notes, location, etc. (try "win" / "loss")'
          />
        </label>

        {filtersOpen && (
          <div className={ui.collapseBody}>
            <div className={ui.sectionHeaderRow}>
              <div />
              <div className={ui.rowActions}>
                <button className={ui.ghostButton} type="button" onClick={clearFilters}>
                  Clear
                </button>
              </div>
            </div>

            <div className={ui.filterGroups}>
              <div className={ui.filterGroup}>
                <div className={ui.label}>Type</div>
                <div className={ui.toggleWrap}>
                  <button
                    type="button"
                    className={types.includes("CASH") ? ui.toggleOn : ui.toggleOff}
                    onClick={() => setTypes(toggleInList(types, "CASH"))}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    className={types.includes("TOURNEY") ? ui.toggleOn : ui.toggleOff}
                    onClick={() => setTypes(toggleInList(types, "TOURNEY"))}
                  >
                    Tourney
                  </button>
                </div>
              </div>

              <div className={ui.filterGroup}>
                <div className={ui.label}>Result</div>
                <div className={ui.toggleWrap}>
                  <button
                    type="button"
                    className={resultsSel.includes("WIN") ? ui.toggleOn : ui.toggleOff}
                    onClick={() => setResultsSel(toggleInList(resultsSel, "WIN"))}
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    className={resultsSel.includes("LOSS") ? ui.toggleOn : ui.toggleOff}
                    onClick={() => setResultsSel(toggleInList(resultsSel, "LOSS"))}
                  >
                    Loss
                  </button>
                  <button
                    type="button"
                    className={resultsSel.includes("EVEN") ? ui.toggleOn : ui.toggleOff}
                    onClick={() => setResultsSel(toggleInList(resultsSel, "EVEN"))}
                  >
                    Even
                  </button>
                </div>
              </div>

              <div className={ui.filterGroup}>
                <div className={ui.label}>Day</div>
                <div className={ui.toggleWrap}>
                  {DOW.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      className={daysSel.includes(d.key) ? ui.toggleOn : ui.toggleOff}
                      onClick={() => setDaysSel(toggleInList(daysSel, d.key))}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={ui.filterGroup}>
                <div className={ui.label}>Game</div>
                <div className={ui.toggleWrap}>
                  {gameOptions.length === 0 ? (
                    <span className={ui.smallMuted}>No games</span>
                  ) : (
                    gameOptions.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={gamesSel.includes(g) ? ui.toggleOn : ui.toggleOff}
                        onClick={() => setGamesSel(toggleInList(gamesSel, g))}
                      >
                        {g}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={ui.filterGroup}>
                <div className={ui.label}>Stake</div>
                <div className={ui.toggleWrap}>
                  {stakeOptions.length === 0 ? (
                    <span className={ui.smallMuted}>No stakes</span>
                  ) : (
                    stakeOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={stakesSel.includes(s) ? ui.toggleOn : ui.toggleOff}
                        onClick={() => setStakesSel(toggleInList(stakesSel, s))}
                      >
                        {s}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className={ui.filterGroup}>
                <div className={ui.label}>Location</div>
                <div className={ui.toggleWrap}>
                  {locationOptions.length === 0 ? (
                    <span className={ui.smallMuted}>No locations</span>
                  ) : (
                    locationOptions.map((l) => (
                      <button
                        key={l}
                        type="button"
                        className={locationsSel.includes(l) ? ui.toggleOn : ui.toggleOff}
                        onClick={() => setLocationsSel(toggleInList(locationsSel, l))}
                      >
                        {l}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={ui.subtle} style={{ marginTop: 10 }}>
              {filteredSessions.length} sessions match (within date range)
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className={ui.cardGrid} style={{ marginTop: 16 }}>
        <div className={ui.card}>
          <div className={ui.cardTitle}>Bankroll</div>
          <div className={ui.cardValue}>
            {summary.bankrollName} ({summary.currency})
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Total</div>
          <div className={ui.cardValue}>
            {summary.bankroll} {summary.currency}
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Profit</div>
          <div className={ui.cardValue}>
            {summary.totalProfit} {summary.currency}
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>{rateMode === "usd" ? "$ Per Hour" : "BB Per Hour"}</div>
          <div className={ui.cardValueRow}>
            <div className={ui.cardValue}>{hourlyDisplay}</div>
            <button className={ui.smallButton} type="button" onClick={() => setRateMode(rateMode === "usd" ? "bb" : "usd")}>
              {rateMode === "usd" ? "BB/hr" : "$/hr"}
            </button>
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Total Time Played</div>
          <div className={ui.cardValue}>{totalTimePlayedText}</div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>$ Per Session</div>
          <div className={ui.cardValue}>{perSessionText}</div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>% Sessions Won</div>
          <div className={`${ui.cardValue} ${winPctGood ? ui.goodText : ui.badText}`}>{winPctText}</div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Tourney ROI</div>
          <div className={`${ui.cardValue} ${roiGood ? ui.goodText : ui.badText}`}>
            {summary.tourney.roi == null ? "—" : `${(summary.tourney.roi * 100).toFixed(1)}%`}
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle}>Sessions</div>
          <div className={ui.cardValue}>
            {summary.counts.entries} (Cash {summary.counts.cash}, Tourney {summary.counts.tourney})
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ marginTop: 16 }}>
        <ProfitChart data={series} currency={summary.currency} />
      </div>
    </div>
  );
}