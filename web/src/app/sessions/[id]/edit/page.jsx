"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "../../../../components/RequireAuth";
import AppNav from "../../../../components/AppNav";
import EntryForm from "../../../../components/EntryForm";
import { getSession, updateSession } from "../../../../lib/sessionsApi";
import { useAuth } from "../../../../context/AuthContext";
import ui from "../../../../styles/ui.module.css";

export default function EditSessionPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  const gameOptions = useMemo(() => user?.games || [], [user]);
  const stakeOptions = useMemo(() => user?.stakes || [], [user]);
  const locationOptions = useMemo(() => user?.locations || [], [user]);

  const [entry, setEntry] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setError("");
      try {
        const data = await getSession(id);
        setEntry(data.entry);
      } catch (e) {
        setEntry(null);
        setError(e.message || "Failed to load session");
      }
    })();
  }, [id]);

  return (
    <RequireAuth requireOnboarding={true}>
      <div className={ui.page}>
        <AppNav />

        <div className={ui.headerRow}>
          <h1 className={ui.title}>Edit Session</h1>
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}

        {!entry ? (
          <div className={ui.subtle}>Loading…</div>
        ) : (
          <div className={ui.panel} style={{ marginTop: 14 }}>
            <EntryForm
              mode="edit"
              bankrolls={bankrolls}
              initialValues={entry}
              gameOptions={gameOptions}
              stakeOptions={stakeOptions}
              locationOptions={locationOptions}
              onSubmit={async (payload) => {
                setBusy(true);
                setError("");
                try {
                  await updateSession(id, payload);
                  router.replace("/sessions");
                } catch (e) {
                  setError(e.message || "Failed to update session");
                } finally {
                  setBusy(false);
                }
              }}
              onCancel={() => router.push("/sessions")}
            />
           
            {busy ? <div className={ui.subtle}>Saving…</div> : null}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}