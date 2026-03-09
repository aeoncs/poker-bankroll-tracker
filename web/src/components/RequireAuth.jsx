"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children, requireOnboarding = true }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (requireOnboarding && user.onboardingCompleted === false) {
      router.replace("/setup");
      return;
    }
  }, [loading, user, router, requireOnboarding]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return null;
  if (requireOnboarding && user.onboardingCompleted === false) return null;

  return children;
}