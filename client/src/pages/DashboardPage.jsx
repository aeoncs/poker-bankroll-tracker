import { useEffect, useState } from "react";
import { apiFetch } from "../api/http";
import { useBankroll } from "../context/BankrollContext";
import ui from "../styles/ui.module.css";
import ProfitChart from "../components/ProfitChart";

export default function DashboardPage() {
  const { activeBankrollId, activeBankroll } = useBankroll();

  const [bucket, setBucket] = useState("day");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBankrollId, bucket]);

  return (
    <div className={ui.page}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Dashboard</h1>
        <button className={ui.button} onClick={loadAll} disabled={busy || !activeBankrollId}>
          Refresh
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
            {/* If you want strictly no inline styles, tell me and I'll move this to ui.module.css */}
            <div className={ui.card}>
              <div className={ui.cardTitle}>Bankroll</div>
              <div className={ui.cardValue}>
                {summary.bankrollName} ({summary.currency})
              </div>
            </div>

            <div className={ui.card}>
              <div className={ui.cardTitle}>Starting</div>
              <div className={ui.cardValue}>
                {summary.startingBankroll} {summary.currency}
              </div>
            </div>

            <div className={ui.card}>
              <div className={ui.cardTitle}>Current</div>
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
              <div className={ui.cardTitle}>Cash Hourly</div>
              <div className={ui.cardValue}>
                {summary.cash.hourly == null ? "—" : `${summary.cash.hourly.toFixed(2)} ${summary.currency}/hr`}
              </div>
            </div>

            <div className={ui.card}>
              <div className={ui.cardTitle}>Tourney ROI</div>
              <div className={ui.cardValue}>
                {summary.tourney.roi == null ? "—" : `${(summary.tourney.roi * 100).toFixed(1)}%`}
              </div>
            </div>

            <div className={ui.card}>
              <div className={ui.cardTitle}>Entries</div>
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