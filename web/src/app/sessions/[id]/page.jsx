"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "../../../components/RequireAuth";
import AppNav from "../../../components/AppNav";
import { getSession, deleteSession } from "../../../lib/sessionsApi";
import ui from "../../../styles/ui.module.css";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function profitForSession(s) {
  const bi = Number(s.buyIn ?? 0);
  if (s.type === "CASH") return Number(s.cashOut ?? 0) - bi;
  return Number(s.winnings ?? 0) - (bi + Number(s.fee ?? 0) + Number(s.rebuys ?? 0) + Number(s.addons ?? 0));
}

export default function SessionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    setError("");
    setBusy(true);
    try {
      const data = await getSession(id);
      setSession(data.entry || data.session || null);
    } catch (e) {
      setSession(null);
      setError(e.message || "Failed to load session");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function onDelete() {
    if (!session?._id) return;
    if (!confirm("Delete this session? This cannot be undone.")) return;

    setBusy(true);
    setError("");
    try {
      await deleteSession(session._id);
      router.replace("/sessions");
    } catch (e) {
      setError(e.message || "Failed to delete session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth requireOnboarding={true}>
      <div className={ui.page}>
        <AppNav />

        <div className={ui.headerRow}>
          <h1 className={ui.title}>Session</h1>
          <div className={ui.splitActions}>
            <button className={ui.ghostButton} type="button" onClick={() => router.push("/sessions")} disabled={busy}>
              Back
            </button>
            {session?._id && (
              <>
                <button className={ui.ghostButton} type="button" onClick={() => router.push(`/sessions/${session._id}/edit`)} disabled={busy}>
                  Edit
                </button>
                <button className={ui.dangerButton} type="button" onClick={onDelete} disabled={busy}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}
        {busy && !session && <div className={ui.subtle}>Loading…</div>}

        {!busy && !session ? (
          <div className={ui.subtle}>Session not found.</div>
        ) : session ? (
          <div className={ui.panel} style={{ marginTop: 14 }}>
            <div className={ui.cardGrid}>
              <div className={ui.card}>
                <div className={ui.cardTitle}>Type</div>
                <div className={ui.cardValue}>{session.type || "—"}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Game</div>
                <div className={ui.cardValue}>{session.game || "—"}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Stake</div>
                <div className={ui.cardValue}>{session.stake || session.stakes || "—"}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Location</div>
                <div className={ui.cardValue}>{session.location || "—"}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Start</div>
                <div className={ui.cardValue}>{formatDateTime(session.startTime)}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>End</div>
                <div className={ui.cardValue}>{formatDateTime(session.endTime)}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Duration (min)</div>
                <div className={ui.cardValue}>{session.durationMinutes ?? "—"}</div>
              </div>

              <div className={ui.card}>
                <div className={ui.cardTitle}>Profit</div>
                <div className={ui.cardValue}>
                  {profitForSession(session)} {session.currency || ""}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className={ui.sectionTitleText}>Notes</div>
              <div className={ui.subtle} style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                {session.notes || "—"}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}