"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import AppNav from "../../components/AppNav";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/apiFetch";
import ui from "../../styles/ui.module.css";

const PRESET_GAMES = [
  "No Limit Holdem",
  "Pot Limit Omaha",
  "HORSE",
  "7 Card Stud",
  "Omaha 8",
  "Razz",
];

function normalizeUnique(arr) {
  const seen = new Set();
  const out = [];
  for (const raw of arr || []) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function applyThemeToBody(nextTheme) {
  if (typeof document === "undefined") return;
  document.body.classList.remove("shellDark", "shellLight");
  document.body.classList.add(nextTheme === "light" ? "shellLight" : "shellDark");
}

export default function SetupPage() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();

  const [bankrollName, setBankrollName] = useState("Main");
  const [currency, setCurrency] = useState("USD");
  const [startingBankroll, setStartingBankroll] = useState("1000");

  const [theme, setTheme] = useState("dark");

  const [games, setGames] = useState(["No Limit Holdem"]);
  const [customGame, setCustomGame] = useState("");

  const [stakes, setStakes] = useState([]);
  const [stakeInput, setStakeInput] = useState("");

  const [locations, setLocations] = useState([]);
  const [locationInput, setLocationInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.onboardingCompleted) router.replace("/dashboard");
  }, [user?.onboardingCompleted, router]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isLight = document.body.classList.contains("shellLight");
    setTheme(isLight ? "light" : "dark");
  }, []);

  const canSubmit = useMemo(() => {
    const sb = Number(startingBankroll);
    return (
      bankrollName.trim().length > 0 &&
      currency.trim().length === 3 &&
      Number.isFinite(sb) &&
      sb >= 0
    );
  }, [bankrollName, currency, startingBankroll]);

  function toggleInList(list, value) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function addUnique(setter, arr, value) {
    const v = String(value || "").trim();
    if (!v) return false;
    const lower = v.toLowerCase();
    if (arr.some((x) => x.toLowerCase() === lower)) return false;
    setter([...arr, v]);
    return true;
  }

  function removeItem(setter, arr, value) {
    setter(arr.filter((x) => x !== value));
  }

  function preventEnterSubmit(e) {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  }

  function onEnterDo(e, fn) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fn();
  }

  function preventImplicitFormSubmit(e) {
    if (e.key !== "Enter") return;

    const tag = e.target.tagName;
    const isTextarea = tag === "TEXTAREA";
    const isSubmitButton =
      tag === "BUTTON" && e.target.getAttribute("type") === "submit";

    if (isTextarea || isSubmitButton) return;

    e.preventDefault();
  }

  async function onThemeChange(nextTheme) {
    setTheme(nextTheme);
    applyThemeToBody(nextTheme);

    try {
      await apiFetch("/api/users/settings", {
        method: "PUT",
        body: JSON.stringify({ theme: nextTheme }),
      });
      await refreshMe();
    } catch {
      // no-op
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await apiFetch("/api/users/setup", {
        method: "POST",
        body: JSON.stringify({
          bankroll: {
            name: bankrollName.trim(),
            currency: currency.trim().toUpperCase(),
            startingBankroll: Number(startingBankroll),
          },
          theme,
          games: normalizeUnique(games),
          stakes: normalizeUnique(stakes),
          locations: normalizeUnique(locations),
        }),
      });

      await refreshMe();
      router.replace("/dashboard");
    } catch (e) {
      setError(e.message || "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth requireOnboarding={false}>
      <div className={`${ui.page} ${ui.narrowPage}`}>
        <AppNav />

        <div className={ui.headerRow} style={{ marginTop: 14 }}>
          <h1 className={ui.title}>Setup</h1>
        </div>

        <div className={ui.subtle} style={{ marginTop: 6 }}>
          Create your first bankroll and defaults for sessions. You can change these later in Settings.
        </div>

        {error && <div className={ui.errorBanner}>{error}</div>}

        <div className={ui.panel} style={{ marginTop: 14 }}>
          <form onSubmit={onSubmit} onKeyDown={preventImplicitFormSubmit} className={ui.formStack}>
            <div className={ui.sectionHeaderRow}>
              <h2 className={ui.sectionTitleText}>Bankroll</h2>
            </div>

            <label className={ui.field}>
              <span className={ui.label}>Bankroll name</span>
              <input
                className={ui.input}
                value={bankrollName}
                onChange={(e) => setBankrollName(e.target.value)}
                disabled={busy}
                onKeyDown={preventEnterSubmit}
              />
            </label>

            <div className={ui.formRow2}>
              <label className={ui.field}>
                <span className={ui.label}>Currency (3 letters)</span>
                <input
                  className={ui.input}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  disabled={busy}
                  onKeyDown={preventEnterSubmit}
                />
              </label>

              <label className={ui.field}>
                <span className={ui.label}>Starting bankroll</span>
                <input
                  className={ui.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={startingBankroll}
                  onChange={(e) => setStartingBankroll(e.target.value)}
                  disabled={busy}
                  onKeyDown={preventEnterSubmit}
                />
              </label>
            </div>

            <div className={ui.sectionHeaderRow} style={{ marginTop: 6 }}>
              <h2 className={ui.sectionTitleText}>Theme</h2>
            </div>

            <div className={ui.toggleWrap}>
              <button
                type="button"
                className={theme === "dark" ? ui.toggleOn : ui.toggleOff}
                onClick={() => onThemeChange("dark")}
                disabled={busy}
              >
                Dark
              </button>
              <button
                type="button"
                className={theme === "light" ? ui.toggleOn : ui.toggleOff}
                onClick={() => onThemeChange("light")}
                disabled={busy}
              >
                Light
              </button>
            </div>

            <div className={ui.sectionHeaderRow} style={{ marginTop: 6 }}>
              <h2 className={ui.sectionTitleText}>Games</h2>
            </div>

            <div className={ui.toggleWrap}>
              {PRESET_GAMES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={games.includes(g) ? ui.toggleOn : ui.toggleOff}
                  onClick={() => setGames(toggleInList(games, g))}
                  disabled={busy}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className={ui.controlsTight}>
              <label className={ui.field} style={{ flex: 1 }}>
                <input
                  className={ui.input}
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                  onKeyDown={(e) =>
                    onEnterDo(e, () => {
                      const added = addUnique(setGames, games, customGame);
                      if (added) setCustomGame("");
                    })
                  }
                  placeholder='Add your own game…'
                  disabled={busy}
                />
              </label>
              <button
                type="button"
                className={ui.button}
                onClick={() => {
                  const added = addUnique(setGames, games, customGame);
                  if (added) setCustomGame("");
                }}
                disabled={busy}
              >
                Add
              </button>
            </div>

            {!!games.length && (
              <div className={ui.toggleWrap}>
                {games.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={ui.toggleOn}
                    onClick={() => removeItem(setGames, games, g)}
                    disabled={busy}
                    title="Remove"
                  >
                    {g} ✕
                  </button>
                ))}
              </div>
            )}

            <div className={ui.sectionHeaderRow} style={{ marginTop: 6 }}>
              <h2 className={ui.sectionTitleText}>Stakes</h2>
            </div>

            <div className={ui.controlsTight}>
              <label className={ui.field} style={{ flex: 1 }}>
                <input
                  className={ui.input}
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  onKeyDown={(e) =>
                    onEnterDo(e, () => {
                      const added = addUnique(setStakes, stakes, stakeInput);
                      if (added) setStakeInput("");
                    })
                  }
                  placeholder='e.g. "1/2", "2/5", "NL50"'
                  disabled={busy}
                />
              </label>
              <button
                type="button"
                className={ui.button}
                onClick={() => {
                  const added = addUnique(setStakes, stakes, stakeInput);
                  if (added) setStakeInput("");
                }}
                disabled={busy}
              >
                Add
              </button>
            </div>

            {!!stakes.length && (
              <div className={ui.toggleWrap}>
                {stakes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={ui.toggleOn}
                    onClick={() => removeItem(setStakes, stakes, s)}
                    disabled={busy}
                    title="Remove"
                  >
                    {s} ✕
                  </button>
                ))}
              </div>
            )}

            <div className={ui.sectionHeaderRow} style={{ marginTop: 6 }}>
              <h2 className={ui.sectionTitleText}>Locations</h2>
            </div>

            <div className={ui.controlsTight}>
              <label className={ui.field} style={{ flex: 1 }}>
                <input
                  className={ui.input}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) =>
                    onEnterDo(e, () => {
                      const added = addUnique(setLocations, locations, locationInput);
                      if (added) setLocationInput("");
                    })
                  }
                  placeholder='e.g. "Bellagio", "Home Game", "ACR"'
                  disabled={busy}
                />
              </label>
              <button
                type="button"
                className={ui.button}
                onClick={() => {
                  const added = addUnique(setLocations, locations, locationInput);
                  if (added) setLocationInput("");
                }}
                disabled={busy}
              >
                Add
              </button>
            </div>

            {!!locations.length && (
              <div className={ui.toggleWrap}>
                {locations.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={ui.toggleOn}
                    onClick={() => removeItem(setLocations, locations, l)}
                    disabled={busy}
                    title="Remove"
                  >
                    {l} ✕
                  </button>
                ))}
              </div>
            )}

            <div className={ui.formActions} style={{ marginTop: 6 }}>
              <button className={ui.button} type="submit" disabled={busy || !canSubmit}>
                {busy ? "Saving…" : "Finish setup"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RequireAuth>
  );
}