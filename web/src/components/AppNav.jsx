"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../lib/authApi";
import { updateSettings } from "../lib/usersApi";
import { useAuth } from "../context/AuthContext";
import ui from "../styles/ui.module.css";

export default function AppNav() {
  const router = useRouter();
  const { user, refreshMe, setUser } = useAuth();

  async function onLogout() {
    await logout();
    await refreshMe();
    router.replace("/login");
  }

  async function onToggleTheme() {
    if (!user) return;

    const prevTheme = user.theme;
    const nextTheme = prevTheme === "light" ? "dark" : "light";


    setUser((prev) => (prev ? { ...prev, theme: nextTheme } : prev));

    try {
      await updateSettings({ theme: nextTheme });
      await refreshMe();
    } catch (e) {
      setUser((prev) => (prev ? { ...prev, theme: prevTheme } : prev));
      alert(e.message || "Failed to update theme");
    }
  }

  return (
    <div className={ui.headerRow} style={{ marginBottom: 16 }}>
      <div className={ui.rowActions}>
        <Link href="/dashboard" className={ui.smallLink}>
          Dashboard
        </Link>
        <Link href="/sessions" className={ui.smallLink}>
          Sessions
        </Link>
        <Link href="/settings" className={ui.smallLink}>
          Settings
        </Link>
      </div>

      <div className={ui.rowActions}>
        <span className={ui.smallMuted}>{user?.email}</span>

        <button className={ui.ghostButton} type="button" onClick={onToggleTheme}>
          {user?.theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>

        <button className={ui.dangerButton} type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}