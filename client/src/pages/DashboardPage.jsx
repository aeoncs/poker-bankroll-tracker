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

function parseBigBlind(stakeStr) {
  if (!stakeStr) return null;
  const m = String(stakeStr).match(/(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)/);
  if (!m) return null;
  const bb = Number(m[3]);
  return Number.isFinite(bb) && bb > 0 ? bb : null;
}

function minutesBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = Math.round((b - a) / 60000);
  return mins >= 0 ? mins : null;
}

function profitForSession(s) {
  const bi = Number(s.buyIn ?? 0);
  if (s.type === "CASH") return Number(s.cashOut ?? 0) - bi;
  return Number(s.winnings ?? 0) - (bi + Number(s.fee ?? 0) + Number(s.rebuys ?? 0) + Number(s.addons ?? 0));
}

export default function DashboardPage() {
  const { activeBankrollId, activeBankroll } = useBankroll();

  const [bucket, setBucket] = useState("day");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [rateMode, setRateMode] = useState("usd"); // "usd" | "bb"
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSessionsAndDefaults() {
    if (!activeBankrollId) return;

    try {
      const data = await apiFetch(`/api/sessions?bankrollId=${encodeURIComponent(activeBankrollId)}`);
      const list = data.entries ?? data.sessions ?? [];
      setSessions(list);

      let earliestMs = null;
      for (const s of list) {
        const raw = s.startTime || s.date || s.createdAt;
        if (!raw) continue;
        const ms = new Date(raw).getTime();
        if (!Number.isFinite(ms)) continue;
        if (earliestMs == null || ms < earliestMs) earliestMs = ms;
      }

      const today = localTodayYYYYMMDD();
      const earliest = earliestMs != null ? new Date(earliestMs) : null;

      setStart((prev) => {
        if (prev) return prev;
        if (!earliest) return "";
        const y = earliest.getFullYear();
        const m = String(earliest.getMonth() + 1).padStart(2, "0");
        const d = String(earliest.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      });

      setEnd((prev) => (prev ? prev : today));
    } catch (e) {
      setSessions([]);
      setError(e.message || "Failed to load sessions");
      setEnd((prev) => (prev ? prev : localTodayYYYYMMDD()));
    }
  }

  async function loadAll() {
    if (!activeBankrollId) return;

    setError("");
    setBusy(true);
    try {
      const qsSummary = new URLSearchParams({
        bankrollId: activeBankrollId,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      }).toString();

      const qsSeries = new URLSearchParams({
        bankrollId: activeBankrollId,
        bucket,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      }).toString();

      const s = await apiFetch(`/api/stats/summary?${qsSummary}`);
      setSummary(s);

      const t = await apiFetch(`/api/stats/timeseries?${qsSeries}`);
      setSeries(t.series || []);
    } catch (e) {
      setSummary(null);
      setSeries([]);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!activeBankrollId) return;
    setStart("");
    setEnd("");
    setSessions([]);
    setSummary(null);
    setSeries([]);
    setRateMode("usd");
    loadSessionsAndDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBankrollId]);

  useEffect(() => {
    if (!activeBankrollId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBankrollId, bucket]);

  useEffect(() => {
    if (!activeBankrollId) return;
    if (!end) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const derived = useMemo(() => {
    const list = sessions || [];

    const startMs = start ? new Date(`${start}T00:00:00`).getTime() : null;
    const endMs = end ? new Date(`${end}T23:59:59`).getTime() : null;

    const inRange = list.filter((s) => {
      const raw = s.startTime || s.date || s.createdAt;
      const ms = raw ? new Date(raw).getTime() : null;
      if (!Number.isFinite(ms)) return false;
      if (startMs != null && ms < startMs) return false;
      if (endMs != null && ms > endMs) return false;
      return true;
    });

    const totalSessions = inRange.length;

    let totalProfit = 0;
    let wins = 0;

    let totalMinutesAll = 0;

    // cash-only for hourly modes
    let cashProfit = 0;
    let cashMinutes = 0;
    let totalBBWon = 0;

    for (const s of inRange) {
      const profit = profitForSession(s);
      totalProfit += profit;
      if (profit > 0) wins += 1;

      const mins =
        s.durationMinutes != null
          ? Number(s.durationMinutes)
          : minutesBetween(s.startTime, s.endTime);

      if (Number.isFinite(mins) && mins > 0) totalMinutesAll += mins;

      if (s.type === "CASH") {
        cashProfit += profit;
        if (Number.isFinite(mins) && mins > 0) cashMinutes += mins;

        const st = s.stake || s.stakes || "";
        const bb = parseBigBlind(st);
        if (bb && Number.isFinite(mins) && mins > 0) totalBBWon += profit / bb;
      }
    }

    const totalHoursAll = totalMinutesAll / 60;
    const cashHours = cashMinutes / 60;

    const dollarsPerHour = cashHours > 0 ? cashProfit / cashHours : null;
    const bbPerHour = cashHours > 0 ? totalBBWon / cashHours : null;

    const dollarsPerSession = totalSessions > 0 ? totalProfit / totalSessions : null;
    const winPct = totalSessions > 0 ? (wins / totalSessions) * 100 : null;

    return {
      totalSessions,
      totalMinutesAll,
      totalHoursAll,
      dollarsPerHour,
      bbPerHour,
      dollarsPerSession,
      winPct,
    };
  }, [sessions, start, end]);

  const currency = summary?.currency || activeBankroll?.currency || "";

  const hourlyText =
    rateMode === "usd"
      ? derived.dollarsPerHour == null
        ? "—"
        : `${derived.dollarsPerHour.toFixed(2)} ${currency}/hr`
      : derived.bbPerHour == null
        ? "—"
        : `${derived.bbPerHour.toFixed(2)} BB/hr`;

  const totalTimeText =
    derived.totalMinutesAll > 0
      ? `${Math.floor(derived.totalMinutesAll / 60)}h ${Math.round(derived.totalMinutesAll % 60)}m`
      : "—";

  const perSessionText =
    derived.dollarsPerSession == null
      ? "—"
      : `${derived.dollarsPerSession.toFixed(2)} ${currency}/session`;

  const winPctText = derived.winPct == null ? "—" : `${derived.winPct.toFixed(1)}%`;

  // color rules
  const winPctGood = derived.winPct != null && derived.winPct >= 50;
  const roiGood = summary?.tourney?.roi != null && summary.tourney.roi >= 1; // >=1 is break-even+

  return (
    <div className={`${ui.page} ${ui.narrowPage}`}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Dashboard</h1>
        <button className={ui.button} onClick={loadAll} disabled={busy || !activeBankrollId}>
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

        <button className={ui.button} onClick={loadAll} disabled={busy || !activeBankrollId}>
          Apply
        </button>
      </div>

      {error && <div className={ui.errorBanner}>{error}</div>}

      {!summary ? (
        <div className={ui.subtle}>No summary loaded.</div>
      ) : (
        <>
          <div className={ui.cardGrid} style={{ marginTop: 16 }}>
            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Bankroll</div>
              <div className={ui.cardValue}>{summary.bankrollName} ({summary.currency})</div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Total</div>
              <div className={ui.cardValue}>{summary.bankroll} {summary.currency}</div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Profit</div>
              <div className={ui.cardValue}>{summary.totalProfit} {summary.currency}</div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>{rateMode === "usd" ? "$ Per Hour" : "BB Per Hour"}</div>

              {/* ✅ value + toggle on same row */}
              <div className={ui.cardValueRow}>
                <div className={ui.cardValue}>{hourlyText}</div>
                <button
                  className={ui.smallButton}
                  type="button"
                  onClick={() => setRateMode(rateMode === "usd" ? "bb" : "usd")}
                >
                  {rateMode === "usd" ? "BB/hr" : "$/hr"}
                </button>
              </div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Total Time Played</div>
              <div className={ui.cardValue}>{totalTimeText}</div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>$ Per Session</div>
              <div className={ui.cardValue}>{perSessionText}</div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>% Sessions Won</div>
              <div className={`${ui.cardValue} ${winPctGood ? ui.goodText : ui.badText}`}>
                {winPctText}
              </div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Tourney ROI</div>
              <div className={`${ui.cardValue} ${roiGood ? ui.goodText : ui.badText}`}>
                {summary.tourney.roi == null ? "—" : `${(summary.tourney.roi * 100).toFixed(1)}%`}
              </div>
            </div>

            <div className={`${ui.card} ${ui.cardUniform}`}>
              <div className={ui.cardTitle}>Sessions</div>
              <div className={ui.cardValue}>
                {summary.counts.entries} (Cash {summary.counts.cash}, Tourney {summary.counts.tourney})
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <ProfitChart data={series} currency={summary.currency} />
          </div>
        </>
      )}
    </div>
  );
}