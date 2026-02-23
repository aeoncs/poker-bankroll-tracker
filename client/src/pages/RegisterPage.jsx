import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import styles from "./RegisterPage.module.css";

export default function RegisterPage() {
  const nav = useNavigate();
  const { refreshMe } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const passwordHint = useMemo(() => {
    if (!password) return "Password must be at least 8 characters.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return "Success!";
  }, [password]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await register({ email, password });
      await refreshMe();
      // ProtectedRoute will redirect to /setup if needed
      nav("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardLogo} aria-hidden="true">
          <img className={styles.cardLogoImg} src="/logo.png" alt="" />
        </div>

        <h1 className={styles.title}>Create Account</h1>
        

        {error && (
          <div className={styles.errorBanner} role="alert">
            <div className={styles.errorTitle}>Sign up failed</div>
            <div className={styles.errorText}>{error}</div>
          </div>
        )}

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              disabled={busy}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>

            <div className={styles.passwordRow}>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Create a password"
                disabled={busy}
                required
              />

              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className={styles.hint}>{passwordHint}</div>
          </label>

          <button className={styles.primaryButton} disabled={busy} type="submit">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Already have an account?</span>
          <Link className={styles.footerLink} to="/login">
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}