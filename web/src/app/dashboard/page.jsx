"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "../../components/RequireAuth";
import AppNav from "../../components/AppNav";
import ProfitChart from "../../components/ProfitChart";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/apiFetch";
import ui from "../../styles/ui.module.css";

function yyyyMmDd(d) {
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

function formatHoursToHhMm(hours) {
  if (hours == null) return "—";
  const totalMins = Math.round(Number(hours) * 60);
  if (!Number.isFinite(totalMins) || totalMins < 0) return "—";
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);
  const [bankrollId, setBankrollId] = useState("");

  const [bucket, setBucket] = useState("day");
  const [start, setStart] = useState(""); // YYYY-MM-DD
  const [end, setEnd] = useState("");     // YYYY-MM-DD

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // $/hr vs BB/hr display for Cash hourly
  const [rateMode, setRateMode] = useState("usd"); // "usd" | "bb"

  useEffect(() => {
    if (!bankrolls.length) return;
    const preferred = user?.defaultBankrollId || bankrolls[0]._id;
    setBankrollId((prev) => prev || preferred);
  }, [bankrolls, user?.defaultBankrollId]);

  // default end = today
  useEffect(() => {
    if (end) return;
    setEnd(yyyyMmDd(new Date()));
  }, [end]);

  // default start = earliest session date for this bankroll 
  useEffect(() => {
    if (!bankrollId || start) return;

    (async () => {
      try {
        const data = await apiFetch(`/api/sessions?${new URLSearchParams({ bankrollId }).toString()}`);
        const sessions = data.entries ?? data.sessions ?? [];
        if (!sessions.length) return;

        let min = null;
        for (const s of sessions) {
          const raw = s.startTime || s.date || s.createdAt;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) continue;
          if (!min || d.getTime() < min.getTime()) min = d;
        }
        if (min) setStart(yyyyMmDd(min));
      } catch {
      }
    })();
  }, [bankrollId, start]);

  async function load() {
    if (!bankrollId) return;
    setBusy(true);
    setError("");

    try {
      const qsSummary = new URLSearchParams({
        bankrollId,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      }).toString();

      const qsSeries = new URLSearchParams({
        bankrollId,
        bucket,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      }).toString();

      const s = await apiFetch(`/api/stats/summary?${qsSummary}`);
      const t = await apiFetch(`/api/stats/timeseries?${qsSeries}`);

      setSummary(s);
      setSeries(t.series || []);
    } catch (e) {
      setSummary(null);
      setSeries([]);
      setError(e.message || "Failed to load stats");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [bankrollId, bucket]);

  const cashHourlyLabel = useMemo(() => {
    if (!summary) return "—";
    const hourly = summary.cash?.hourly;
    if (hourly == null) return "—";

    if (rateMode === "usd") {
      return `${Number(hourly).toFixed(2)} ${summary.currency}/hr`;
    }

    const bb = parseBigBlind(user?.defaultStake || "");
    if (!bb) return "—";
    const bbHr = Number(hourly) / bb;
    return `${bbHr.toFixed(2)} BB/hr`;
  }, [summary, rateMode, user?.defaultStake]);

  // Color coding helpers
  const winPct = summary?.totals?.winPct ?? null; // 0..1
  const winPctText = winPct == null ? "—" : `${(winPct * 100).toFixed(1)}%`;
  const winPctClass = winPct == null ? "" : winPct >= 0.5 ? ui.goodValue : ui.badValue;

  const roi = summary?.tourney?.roi ?? null;
  const roiText = roi == null ? "—" : `${(roi * 100).toFixed(1)}%`;
  const roiClass = roi == null ? "" : roi >= 0 ? ui.goodValue : ui.badValue;

  const dollarsPerSession = summary?.totals?.dollarsPerSession ?? null;
  const dollarsPerSessionText =
    dollarsPerSession == null ? "—" : `${Number(dollarsPerSession).toFixed(2)} ${summary.currency}/session`;

  const totalTimeText = formatHoursToHhMm(summary?.totals?.hours);

  return (
    <RequireAuth requireOnboarding={true}>
      <div className={ui.page}>
        <AppNav />

        <div className={ui.headerRow}>
          <h1 className={ui.title}>Dashboard</h1>
          <button className={ui.button} onClick={load} disabled={busy || !bankrollId}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className={ui.controls} style={{ marginTop: 12 }}>
          <label className={ui.fieldTight}>
            <span className={ui.label}>Bankroll</span>
            <select
              className={`${ui.select} ${ui.selectCompact}`}
              value={bankrollId}
              onChange={(e) => setBankrollId(e.target.value)}
              disabled={!bankrolls.length}
            >
              {bankrolls.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.currency})
                </option>
              ))}
            </select>
          </label>

          <label className={ui.fieldTight}>
            <span className={ui.label}>Bucket</span>
            <select className={ui.select} value={bucket} onChange={(e) => setBucket(e.target.value)}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>

          <label className={ui.fieldTight}>
            <span className={ui.label}>Start</span>
            <input className={ui.input} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>

          <label className={ui.fieldTight}>
            <span className={ui.label}>End</span>
            <input className={ui.input} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>

          <button className={ui.button} type="button" onClick={load} disabled={busy || !bankrollId}>
            Apply
          </button>
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}

        {!summary ? (
          <div className={ui.subtle} style={{ marginTop: 14 }}>
            No summary loaded.
          </div>
        ) : (
          <>
            <div className={ui.cardGrid} style={{ marginTop: 14 }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div className={ui.cardTitle}>{rateMode === "usd" ? "$ Per Hour" : "BB Per Hour"}</div>
                  <button
                    className={ui.ghostButton}
                    type="button"
                    onClick={() => setRateMode((m) => (m === "usd" ? "bb" : "usd"))}
                    style={{ padding: "6px 10px", borderRadius: 999 }}
                  >
                    {rateMode === "usd" ? "BB/hr" : "$/hr"}
                  </button>
                </div>
                <div className={ui.cardValue}>{cashHourlyLabel}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Total Time Played</div>
                <div className={ui.cardValue}>{totalTimeText}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>$ Per Session</div>
                <div className={ui.cardValue}>{dollarsPerSessionText}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>% Sessions Won</div>
                <div className={`${ui.cardValue} ${winPctClass}`}>{winPctText}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Tourney ROI</div>
                <div className={`${ui.cardValue} ${roiClass}`}>{roiText}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Sessions</div>
                <div className={ui.cardValue}>
                  {summary.counts?.entries ?? 0} (Cash {summary.counts?.cash ?? 0}, Tourney {summary.counts?.tourney ?? 0})
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <ProfitChart data={series} currency={summary.currency} />
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}