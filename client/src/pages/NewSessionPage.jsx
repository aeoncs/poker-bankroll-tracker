import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api/sessions";
import { useAuth } from "../context/AuthContext";
import EntryForm from "../components/EntryForm";
import ui from "../styles/ui.module.css";

export default function NewSessionPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  const gameOptions = useMemo(() => user?.games || [], [user]);
  const stakeOptions = useMemo(() => user?.stakes || [], [user]);
  const locationOptions = useMemo(() => user?.locations || [], [user]);

  return (
    <div className={ui.page}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>New Session</h1>
      </div>

      <div className={ui.panel} style={{ marginTop: 14 }}>
        <EntryForm
          mode="create"
          bankrolls={bankrolls}
          gameOptions={gameOptions}
          stakeOptions={stakeOptions}
          locationOptions={locationOptions}
          defaultGame={user?.defaultGame || ""}
          defaultStake={user?.defaultStake || ""}
          defaultLocation={user?.defaultLocation || ""}
          onSubmit={async (payload) => {
            await createSession(payload);
            nav("/sessions");
          }}
          onCancel={() => nav("/sessions")}
        />
      </div>
    </div>
  );
}