import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSession } from "../api/sessions";
import ui from "../styles/ui.module.css";

function fmt(x) {
  if (x == null || x === "") return "—";
  return String(x);
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function durationMinutes(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = Math.round((b - a) / 60000);
  return mins >= 0 ? mins : null;
}

export default function SessionDetailsPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      setError("");
      try {
        const data = await getSession(id);
        setSession(data.session ?? data.entry ?? data);
      } catch (e) {
        setError(e.message || "Failed to load session");
        setSession(null);
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  const mins = durationMinutes(session?.startTime, session?.endTime);

  return (
    <div className={ui.page}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Session</h1>
        <div className={ui.splitActions}>
          <Link className={ui.ghostButton} to="/sessions">← Back</Link>
          <Link className={ui.linkButton} to={`/sessions/${id}/edit`}>Edit</Link>
        </div>
      </div>

      {busy && <div className={ui.subtle}>Loading…</div>}
      {error && <div className={ui.errorBanner}>{error}</div>}

      {session && (
        <div className={ui.panel} style={{ marginTop: 14 }}>
          <div className={ui.cardGrid}>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Type</div>
              <div className={ui.cardValue}>{fmt(session.type)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Game</div>
              <div className={ui.cardValue}>{fmt(session.game)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Stake</div>
              <div className={ui.cardValue}>{fmt(session.stake)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Location</div>
              <div className={ui.cardValue}>{fmt(session.location)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Buy-in</div>
              <div className={ui.cardValue}>{fmt(session.buyIn ?? session.tourneyBuyIn ?? session.cost)} {fmt(session.currency)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Cash-out</div>
              <div className={ui.cardValue}>{fmt(session.cashOut ?? session.winnings)} {fmt(session.currency)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Start</div>
              <div className={ui.cardValue}>{fmtTime(session.startTime)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>End</div>
              <div className={ui.cardValue}>{fmtTime(session.endTime)}</div>
            </div>
            <div className={ui.card}>
              <div className={ui.cardTitle}>Duration</div>
              <div className={ui.cardValue}>{mins == null ? "—" : `${mins} min`}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className={ui.sectionTitleText}>Notes</div>
            <div className={ui.subtle} style={{ whiteSpace: "pre-wrap" }}>
              {session.notes ? session.notes : "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}