import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, updateSession } from "../api/sessions";
import { useAuth } from "../context/AuthContext";
import EntryForm from "../components/EntryForm";
import ui from "../styles/ui.module.css";

export default function EditSessionPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  const gameOptions = useMemo(() => user?.games || [], [user]);
  const stakeOptions = useMemo(() => user?.stakes || [], [user]);
  const locationOptions = useMemo(() => user?.locations || [], [user]);

  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError("");
      try {
        const data = await getSession(id);
        if (!mounted) return;
        setSession(data.entry ?? data.session);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load session");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className={ui.page}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Edit Session</h1>
      </div>

      {error && <div className={ui.errorBanner}>{error}</div>}

      {!session ? (
        <div className={ui.subtle}>Loading…</div>
      ) : (
        <div className={ui.panel} style={{ marginTop: 14 }}>
          <EntryForm
            mode="edit"
            bankrolls={bankrolls}
            initialValues={session}
            gameOptions={gameOptions}
            stakeOptions={stakeOptions}
            locationOptions={locationOptions}
            onSubmit={async (payload) => {
              await updateSession(id, payload);
              nav("/sessions");
            }}
            onCancel={() => nav("/sessions")}
          />
        </div>
      )}
    </div>
  );
}