import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useBankroll } from "../context/BankrollContext";
import { useTheme } from "../context/ThemeContext";
import styles from "./AppLayout.module.css";

export default function AppLayout({ variant = "app" }) {
  const nav = useNavigate();
  const { user, refreshMe } = useAuth();
  const { bankrolls, activeBankrollId, setActiveBankrollId } = useBankroll();
  const { theme, toggleTheme } = useTheme();

  const shellClass =
    theme === "light"
      ? `${styles.shell} ${styles.shellLight}`
      : `${styles.shell} ${styles.shellDark}`;

  const isSetup = variant === "setup";

  async function onLogout() {
    await logout();
    await refreshMe();
    nav("/login");
  }

  return (
    <div className={shellClass}>
      <header className={styles.topNav}>
        <div className={styles.brand}>
          <img className={styles.logoImg} src="/logo.png" alt="Poker Bankroll Tracker logo" />
          <span className={styles.brandText}>3BetMonkey - Poker Bankroll Tracker</span>
        </div>

        {!isSetup && (
          <nav className={styles.topLinks}>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}>
              Dashboard
            </NavLink>
            <NavLink to="/sessions" className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}>
              Sessions
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}>
              Settings
            </NavLink>
          </nav>
        )}

        <div className={styles.rightControls}>
          {!isSetup && (
            <label className={styles.bankrollPicker}>
              <span className={styles.bankrollLabel}>Bankroll</span>
              <select
                value={activeBankrollId}
                onChange={(e) => setActiveBankrollId(e.target.value)}
                className={styles.select}
              >
                {bankrolls.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.currency})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.userArea}>
            <span className={styles.email}>{user?.email}</span>

            <button className={styles.button} type="button" onClick={toggleTheme}>
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>

            <button className={styles.button} onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {!isSetup && (
        <nav className={styles.bottomNav}>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? styles.bottomActive : styles.bottomLink)}>
            <span className={styles.bottomIcon}>📊</span>
            <span className={styles.bottomText}>Dashboard</span>
          </NavLink>

          <NavLink to="/sessions" className={({ isActive }) => (isActive ? styles.bottomActive : styles.bottomLink)}>
            <span className={styles.bottomIcon}>🧾</span>
            <span className={styles.bottomText}>Sessions</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.bottomActive : styles.bottomLink)}>
            <span className={styles.bottomIcon}>⚙️</span>
            <span className={styles.bottomText}>Settings</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}