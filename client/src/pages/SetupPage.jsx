import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeSetup } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import styles from "./SetupPage.module.css";

const PRESET_GAMES = [
  "No Limit Holdem",
  "Pot Limit Omaha",
  "HORSE",
  "7 Card Stud",
  "Omaha 8",
  "Razz",
];

export default function SetupPage() {
  const nav = useNavigate();
  const { refreshMe } = useAuth();
  const { theme, setTheme } = useTheme();

  // bankroll
  const [bankrollName, setBankrollName] = useState("Main");
  const [currency, setCurrency] = useState("USD");
  const [startingBankroll, setStartingBankroll] = useState(1000);

  // pick-lists
  const [games, setGames] = useState(["No Limit Holdem"]);
  const [customGame, setCustomGame] = useState("");

  const [stakes, setStakes] = useState([]);
  const [stakeInput, setStakeInput] = useState("");

  const [locations, setLocations] = useState([]);
  const [locationInput, setLocationInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return bankrollName.trim().length > 0 && currency.trim().length === 3 && Number(startingBankroll) >= 0;
  }, [bankrollName, currency, startingBankroll]);

  function addUnique(setter, arr, value) {
    const v = value.trim();
    if (!v) return;
    const lower = v.toLowerCase();
    if (arr.some((x) => x.toLowerCase() === lower)) return;
    setter([...arr, v]);
  }

  function removeItem(setter, arr, value) {
    setter(arr.filter((x) => x !== value));
  }

  function applyTheme(nextTheme) {
    setTheme(nextTheme); // updates localStorage + rerenders AppLayout too
  }

  function preventEnterSubmit(e) {
    if (e.key === "Enter") e.preventDefault();
  }

  function onEnterDo(e, fn) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fn();
  }

  function addGame() {
    addUnique(setGames, games, customGame);
    setCustomGame("");
  }

  function addStake() {
    addUnique(setStakes, stakes, stakeInput);
    setStakeInput("");
  }

  function addLocation() {
    addUnique(setLocations, locations, locationInput);
    setLocationInput("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await completeSetup({
        bankroll: {
          name: bankrollName.trim(),
          currency: currency.trim().toUpperCase(),
          startingBankroll: Number(startingBankroll),
        },
        theme,
        games,
        stakes,
        locations,
      });

      await refreshMe();
      nav("/dashboard");
    } catch (err) {
      const msg = err.message || "Setup failed";
       {
        setError(msg);
      }
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

        <h1 className={styles.title}>Setup</h1>
        <p className={styles.subtitle}>
          Create your first bankroll and pick defaults for session entries,
          <br />
          you can always change these later in Settings.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.sectionTitle}>Bankroll (Required)</div>

          <label className={styles.field}>
            <span className={styles.label}>Bankroll Name</span>
            <input
              className={styles.input}
              value={bankrollName}
              onChange={(e) => setBankrollName(e.target.value)}
              placeholder="Main"
              disabled={busy}
              onKeyDown={preventEnterSubmit}
            />
          </label>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Currency (3 letters)</span>
              <input
                className={styles.input}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                disabled={busy}
                onKeyDown={preventEnterSubmit}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Starting bankroll</span>
              <input
                className={styles.input}
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

          <div className={styles.sectionTitle}>Theme</div>
          <div className={styles.row2}>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="theme"
                checked={theme === "dark"}
                onChange={() => applyTheme("dark")}
                disabled={busy}
              />
              <span>Dark</span>
            </label>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="theme"
                checked={theme === "light"}
                onChange={() => applyTheme("light")}
                disabled={busy}
              />
              <span>Light</span>
            </label>
          </div>

          <div className={styles.sectionTitle}>Games</div>
          <div className={styles.chipGrid}>
            {PRESET_GAMES.map((g) => {
              const selected = games.includes(g);
              return (
                <button
                  type="button"
                  key={g}
                  className={selected ? styles.chipActive : styles.chip}
                  onClick={() => setGames(selected ? games.filter((x) => x !== g) : [...games, g])}
                  disabled={busy}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <div className={styles.inlineAdd}>
            <input
              className={styles.input}
              value={customGame}
              onChange={(e) => setCustomGame(e.target.value)}
              onKeyDown={(e) => onEnterDo(e, addGame)}
              placeholder="Add your own game…"
              disabled={busy}
            />
            <button type="button" className={styles.ghostButton} onClick={addGame} disabled={busy}>
              Add
            </button>
          </div>

          {!!games.length && (
            <div className={styles.selectedList}>
              {games.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={styles.selectedChip}
                  onClick={() => removeItem(setGames, games, g)}
                  disabled={busy}
                >
                  {g} ✕
                </button>
              ))}
            </div>
          )}

          <div className={styles.sectionTitle}>Stakes</div>
          <div className={styles.inlineAdd}>
            <input
              className={styles.input}
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              onKeyDown={(e) => onEnterDo(e, addStake)}
              placeholder='e.g. "1/2", "2/5", "NL50"'
              disabled={busy}
            />
            <button type="button" className={styles.ghostButton} onClick={addStake} disabled={busy}>
              Add
            </button>
          </div>

          {!!stakes.length && (
            <div className={styles.selectedList}>
              {stakes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.selectedChip}
                  onClick={() => removeItem(setStakes, stakes, s)}
                  disabled={busy}
                >
                  {s} ✕
                </button>
              ))}
            </div>
          )}

          <div className={styles.sectionTitle}>Locations</div>
          <div className={styles.inlineAdd}>
            <input
              className={styles.input}
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => onEnterDo(e, addLocation)}
              placeholder='e.g. "Bellagio", "Home Game", "ACR"'
              disabled={busy}
            />
            <button type="button" className={styles.ghostButton} onClick={addLocation} disabled={busy}>
              Add
            </button>
          </div>

          {!!locations.length && (
            <div className={styles.selectedList}>
              {locations.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={styles.selectedChip}
                  onClick={() => removeItem(setLocations, locations, l)}
                  disabled={busy}
                >
                  {l} ✕
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <button className={styles.primaryButton} disabled={busy || !canSubmit} type="submit">
            {busy ? "Saving…" : "Finish setup"}
          </button>
        </form>
      </div>
    </div>
  );
}