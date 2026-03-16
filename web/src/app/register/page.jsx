"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "../../lib/authApi";
import { useAuth } from "../../context/AuthContext";
import styles from "./register.module.css";

const EMAIL_KEY = "rememberEmail";
const REMEMBER_KEY = "rememberEmailEnabled";

const GOOGLE_AUTH_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`
    : "http://localhost:4000/api/auth/google";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, refreshMe } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);


  useEffect(() => {
    try {
      const enabled = localStorage.getItem(REMEMBER_KEY);
      const isEnabled = enabled === null ? true : enabled === "true";
      setRememberEmail(isEnabled);

      if (isEnabled) {
        const savedEmail = localStorage.getItem(EMAIL_KEY) || "";
        setEmail(savedEmail);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(REMEMBER_KEY, String(rememberEmail));
      if (!rememberEmail) localStorage.removeItem(EMAIL_KEY);
    } catch {
      // ignore
    }
  }, [rememberEmail]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await register(email, password);

      if (rememberEmail) {
        try {
          localStorage.setItem(EMAIL_KEY, email);
        } catch {
        }
      }

      await refreshMe();
      router.replace("/setup");
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.marketing}>
          <div className={styles.brandRow}>
            <div className={styles.logo}>
              <img className={styles.logoImg} src="/logo.png" alt="Poker Bankroll Tracker logo" />
            </div>

            <div>
              <div className={styles.brand}>Poker Bankroll Tracker</div>
              <div className={styles.tagline}>
                Create an account to start tracking sessions.
                <br />
              </div>
            </div>
          </div>

          <ul className={styles.bullets}>
            <li className={styles.bullet}>
              <span className={styles.bulletIcon}>💼</span>
              Track multiple bankrolls (Cash / Online / Tournaments)
            </li>
            <li className={styles.bullet}>
              <span className={styles.bulletIcon}>🧾</span>
              Session Notes are searchable for easy review of past sessions!
            </li>
            <li className={styles.bullet}>
              <span className={styles.bulletIcon}>📈</span>
              Filter & Chart your data for real time analysis.
            </li>
            <li className={styles.bullet}>
              <span className={styles.bulletIcon}>🔒</span>
              Secure and private. Your data is encrypted and will never be shared.
            </li>
          </ul>
        </section>

        <section className={styles.cardWrap}>
          <div className={styles.card}>
            <h1 className={styles.cardTitle}>Create account</h1>
      

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
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  disabled={busy}
                />
                <span>Remember email on this device</span>
              </label>

              <button className={styles.primaryButton} disabled={busy} type="submit">
                {busy ? "Creating…" : "Create account"}
              </button>

              <button
                type="button"
                className={styles.googleButton}
                onClick={() => {
                  window.location.href = GOOGLE_AUTH_URL;
                }}
                disabled={busy}
              >
                <img className={styles.googleButtonImg} src="/google_sign_in.png" alt="Continue with Google" />
              </button>
            </form>

            <div className={styles.footer}>
              <span>Already have an account?</span>
              <Link className={styles.footerLink} href="/login">
                Sign in →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}