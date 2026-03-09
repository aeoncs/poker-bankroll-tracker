"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import AppNav from "../../components/AppNav";
import { useAuth } from "../../context/AuthContext";
import { deleteSession, listSessions } from "../../lib/sessionsApi";
import ui from "../../styles/ui.module.css";

function minutesBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = Math.round((b - a) / 60000);
  return mins >= 0 ? mins : null;
}

function formatDuration(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
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

function ratePerHour(profit, minutes) {
  if (minutes == null || minutes <= 0) return null;
  return profit / (minutes / 60);
}


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

const DOW = [
  { key: 0, label: "Sun", long: "sunday" },
  { key: 1, label: "Mon", long: "monday" },
  { key: 2, label: "Tue", long: "tuesday" },
  { key: 3, label: "Wed", long: "wednesday" },
  { key: 4, label: "Thu", long: "thursday" },
  { key: 5, label: "Fri", long: "friday" },
  { key: 6, label: "Sat", long: "saturday" },
];

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function SessionsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // bankrolls come from auth user
  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  // local "active bankroll" (since BankrollContext not ported yet)
  const [activeBankrollId, setActiveBankrollId] = useState("");
  const activeBankroll = useMemo(
    () => bankrolls.find((b) => b._id === activeBankrollId) || null,
    [bankrolls, activeBankrollId]
  );

  // initialize active bankroll from user default, else first
  useEffect(() => {
    if (!bankrolls.length) return;
    const preferred = user?.defaultBankrollId || bankrolls[0]._id;
    setActiveBankrollId((prev) => prev || preferred);
  }, [bankrolls, user?.defaultBankrollId]);

  const [rateMode, setRateMode] = useState("usd"); // "usd" | "bb"
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Multi-select filters
  const [types, setTypes] = useState([]);
  const [gamesSel, setGamesSel] = useState([]);
  const [stakesSel, setStakesSel] = useState([]);
  const [locationsSel, setLocationsSel] = useState([]);
  const [daysSel, setDaysSel] = useState([]);
  const [resultsSel, setResultsSel] = useState([]);
  const [query, setQuery] = useState("");

  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const gameOptions = user?.games || [];
  const stakeOptions = user?.stakes || [];
  const locationOptions = user?.locations || [];

  async function load() {
    if (!activeBankrollId) return;
    setBusy(true);
    setError("");
    try {
      const data = await listSessions({ bankrollId: activeBankrollId });
      setSessions(data.entries ?? data.sessions ?? []);
    } catch (e) {
      setSessions([]);
      setError(e.message || "Failed to load sessions");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBankrollId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (sessions || []).filter((s) => {
      if (types.length && !types.includes(s.type)) return false;

      const g = (s.game || "").trim();
      if (gamesSel.length && !gamesSel.some((x) => x.toLowerCase() === g.toLowerCase())) return false;

      const st = (s.stake || s.stakes || "").trim();
      if (stakesSel.length && !stakesSel.some((x) => x.toLowerCase() === st.toLowerCase())) return false;

      const loc = (s.location || "").trim();
      if (locationsSel.length && !locationsSel.some((x) => x.toLowerCase() === loc.toLowerCase())) return false;

      const dateObj = getSessionLocalDateObject(s);

      if (daysSel.length) {
        if (!dateObj) return false;
        const dow = dateObj.getDay();
        if (!daysSel.includes(dow)) return false;
      }

      if (resultsSel.length) {
        const profit = profitForSession(s);
        const bucket = profit > 0 ? "WIN" : profit < 0 ? "LOSS" : "EVEN";
        if (!resultsSel.includes(bucket)) return false;
      }

      if (q) {
        const profit = profitForSession(s);
        const resultLabel = profit > 0 ? "win" : profit < 0 ? "loss" : "even";

        // allow searching day names like "monday" / "mon"
        const dayLong = dateObj ? DOW[dateObj.getDay()]?.long : "";
        const dayShort = dateObj ? DOW[dateObj.getDay()]?.label.toLowerCase() : "";

        const hay = [
          s.game,
          s.stake,
          s.stakes,
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
  }, [sessions, types, gamesSel, stakesSel, locationsSel, daysSel, resultsSel, query]);

  async function onDelete(id) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    try {
      await deleteSession(id);
      await load();
    } catch (e) {
      setError(e.message || "Failed to delete");
    }
  }

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

  return (
    <RequireAuth requireOnboarding={true}>
      <div className={`${ui.page} ${ui.narrowPage}`}>
        <AppNav />

        <div className={ui.headerRow}>
          <h1 className={ui.title}>Sessions</h1>

          <div className={ui.splitActions}>
            <button className={ui.button} onClick={load} disabled={busy || !activeBankrollId}>
              {busy ? "Loading…" : "Refresh"}
            </button>

            <button className={ui.ghostButton} type="button" onClick={() => setRateMode(rateMode === "usd" ? "bb" : "usd")}>
              {rateMode === "usd" ? "Show BB/hr" : "Show $/hr"}
            </button>

            <Link className={ui.linkButton} href="/sessions/new">
              New Session
            </Link>
          </div>
        </div>

        {/* Active bankroll picker (temporary until BankrollContext is ported) */}
        <div className={ui.controls} style={{ marginTop: 8 }}>
          <label className={ui.fieldTight}>
            <span className={ui.label}>Bankroll</span>
            <select
              className={`${ui.select} ${ui.selectCompact}`}
              value={activeBankrollId}
              onChange={(e) => setActiveBankrollId(e.target.value)}
              disabled={!bankrolls.length}
            >
              {bankrolls.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.currency})
                </option>
              ))}
            </select>
          </label>

          {activeBankroll && (
            <div className={ui.subtle}>
              Bankroll - <strong>{activeBankroll.name}</strong> ({activeBankroll.currency})
            </div>
          )}
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}

        {/* Filters */}
        <div className={ui.panel} style={{ marginTop: 14 }}>
          <button
            type="button"
            className={ui.collapseHeader}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <div className={ui.collapseTitleRow}>
              <span className={ui.sectionTitleText}>Filters</span>
              {Boolean(anyFiltersActive) ? <span className={ui.badge}>Active</span> : null}
            </div>

            <span className={ui.collapseChevron} aria-hidden="true">
              {filtersOpen ? "▾" : "▸"}
            </span>
          </button>

          <br />

          {/* Search stays visible even when collapsed */}
          <label className={ui.field}>
            <span className={ui.label}>Search</span>
            <input
              className={ui.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='notes, location, etc. (try "win" / "loss" / "monday")'
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
            </div>
          )}
        </div>

        {/* Sessions list */}
        <div className={ui.listCard} style={{ marginTop: 14 }}>
          <div className={ui.listHeaderRow}>
            <div className={ui.sectionTitleText}>All Sessions</div>
            <div className={ui.smallMuted}>{filtered.length} shown</div>
          </div>

          <div className={ui.scrollList}>
            {filtered.length === 0 ? (
              <div className={ui.subtle} style={{ padding: 12 }}>
                No sessions match your filters.
              </div>
            ) : (
              filtered.map((s) => {
                const mins = s.durationMinutes ?? minutesBetween(s.startTime, s.endTime);
                const profit = profitForSession(s);
                const perHour = ratePerHour(profit, mins);

                const st = s.stake || s.stakes || "";
                const bb = parseBigBlind(st);
                const bbPerHour = perHour != null && bb ? perHour / bb : null;

                const rateLabel =
                  rateMode === "usd"
                    ? perHour == null
                      ? "—"
                      : `${perHour.toFixed(2)} ${s.currency || activeBankroll?.currency || ""}/hr`
                    : bbPerHour == null
                      ? "—"
                      : `${bbPerHour.toFixed(2)} BB/hr`;

                const resultLabel = profit > 0 ? "WIN" : profit < 0 ? "LOSS" : "EVEN";

                const dateObj = getSessionLocalDateObject(s);
                const dateStr = dateObj ? dateObj.toLocaleDateString(undefined) : "—";

                return (
                  <div key={s._id} className={ui.sessionRow} data-result={resultLabel} role="group">
                    <div style={{ cursor: "pointer" }} onClick={() => router.push(`/sessions/${s._id}`)}>
                      <div className={ui.sessionTitle}>
                        <span className={ui.badge}>{s.type || "SESSION"}</span>
                        <span className={ui.badge}>{resultLabel}</span>
                        <span className={ui.badge}>{s.game || "—"}</span>
                        <span className={ui.badge}>{st || "—"}</span>
                        <span className={ui.badge}>{s.location || "—"}</span>
                        <span className={ui.smallMuted}>{dateStr}</span>
                      </div>

                      <div className={ui.sessionStatsGrid}>
                        <div className={ui.sessionStat}>
                          <div className={ui.smallMuted}>Buy-in</div>
                          <div className={ui.sessionStatValue}>
                            {s.buyIn ?? "—"} {s.currency || activeBankroll?.currency || ""}
                          </div>
                        </div>

                        <div className={ui.sessionStat}>
                          <div className={ui.smallMuted}>{s.type === "CASH" ? "Cash-out" : "Winnings"}</div>
                        <div
                        className={`${ui.sessionStatValue} ${
                          (s.type === "CASH" ? Number(s.cashOut ?? 0) - Number(s.buyIn ?? 0) : profitForSession(s)) >= 0
                            ? ui.valueGood
                            : ui.valueBad
                        }`}
                      >
                        {s.type === "CASH" ? (s.cashOut ?? "—") : (s.winnings ?? "—")}{" "}
                        {s.currency || activeBankroll?.currency || ""}
                        </div>
                        </div>

                        <div className={ui.sessionStat}>
                          <div className={ui.smallMuted}>Duration</div>
                          <div className={ui.sessionStatValue}>{formatDuration(mins)}</div>
                        </div>

                        <div className={ui.sessionStat}>
                          <div className={ui.smallMuted}>{rateMode === "usd" ? "$/hr" : "BB/hr"}</div>
                          <div className={ui.sessionStatValue}>{rateLabel}</div>
                        </div>
                      </div>

                      {s.notes ? (
                      <div className={ui.sessionNotes}>
                            {String(s.notes).slice(0, 140)}
                            {String(s.notes).length > 140 ? "…" : ""}
                          </div>
                      ) : null}
                    </div>

                    <div className={ui.rightCol} style={{ padding: 12 }}>
                      <button
                        className={ui.ghostButton}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/sessions/${s._id}/edit`);
                        }}
                        disabled={busy}
                      >
                        Edit
                      </button>

                      <button
                        className={ui.dangerButton}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s._id);
                        }}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}