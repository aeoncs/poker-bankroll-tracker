"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../../../components/RequireAuth";
import AppNav from "../../../components/AppNav";
import EntryForm from "../../../components/EntryForm";
import { createSession } from "../../../lib/sessionsApi";
import { useAuth } from "../../../context/AuthContext";
import ui from "../../../styles/ui.module.css";

export default function NewSessionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  // preferences (from Setup/Settings)
  const gameOptions = useMemo(() => user?.games || [], [user]);
  const stakeOptions = useMemo(() => user?.stakes || [], [user]);
  const locationOptions = useMemo(() => user?.locations || [], [user]);

  const defaultGame = user?.defaultGame || "";
  const defaultStake = user?.defaultStake || "";
  const defaultLocation = user?.defaultLocation || "";

  const [error, setError] = useState("");

  return (
    <RequireAuth requireOnboarding={true}>
      <div className={ui.page}>
        <AppNav />

        <div className={ui.headerRow}>
          <h1 className={ui.title}>New Session</h1>
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}

        <div className={ui.panel} style={{ marginTop: 14 }}>
          <EntryForm
            mode="create"
            bankrolls={bankrolls}
            gameOptions={gameOptions}
            stakeOptions={stakeOptions}
            locationOptions={locationOptions}
            defaultGame={defaultGame}
            defaultStake={defaultStake}
            defaultLocation={defaultLocation}
            onSubmit={async (payload) => {
              setError("");
              try {
                await createSession(payload);
                router.replace("/sessions");
              } catch (e) {
                setError(e.message || "Failed to create session");
              }
            }}
            onCancel={() => router.push("/sessions")}
          />
        </div>
      </div>
    </RequireAuth>
  );
}