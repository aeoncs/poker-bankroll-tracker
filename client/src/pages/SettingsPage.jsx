import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createBankroll, deleteBankroll, updateBankroll, updateSettings } from "../api/users";
import ui from "../styles/ui.module.css";

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
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export default function SettingsPage() {
  const { user, refreshMe } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  const [defaultBankrollId, setDefaultBankrollId] = useState(user?.defaultBankrollId || "");

  // Preferences lists
  const [games, setGames] = useState(user?.games ? user.games : PRESET_GAMES);
  const [stakes, setStakes] = useState(user?.stakes || []);
  const [locations, setLocations] = useState(user?.locations || []);

  const [gameInput, setGameInput] = useState("");
  const [stakeInput, setStakeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  // ✅ Defaults
  const [defaultGame, setDefaultGame] = useState(user?.defaultGame || "");
  const [defaultStake, setDefaultStake] = useState(user?.defaultStake || "");
  const [defaultLocation, setDefaultLocation] = useState(user?.defaultLocation || "");

  // Inline bankroll edit
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editStarting, setEditStarting] = useState("");

  // Create bankroll modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("Main");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newStarting, setNewStarting] = useState("1000");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Auto-save status
  const [saveStatus, setSaveStatus] = useState("");
  const hydratedRef = useRef(false);
  const lastSentRef = useRef("");

  useEffect(() => {
    if (!user) return;

    setDefaultBankrollId(user.defaultBankrollId || "");

    setGames(user.games ? user.games : PRESET_GAMES);
    setStakes(user.stakes || []);
    setLocations(user.locations || []);

    setDefaultGame(user.defaultGame || "");
    setDefaultStake(user.defaultStake || "");
    setDefaultLocation(user.defaultLocation || "");

  
    const baseline = JSON.stringify({
  defaultBankrollId: user.defaultBankrollId || "",
  games: normalizeUnique(user.games ?? PRESET_GAMES),
  stakes: normalizeUnique(user.stakes || []),
  locations: normalizeUnique(user.locations || []),

  // include defaults
  defaultGame: user.defaultGame || "",
  defaultStake: user.defaultStake || "",
  defaultLocation: user.defaultLocation || "",
});

    lastSentRef.current = baseline;
    hydratedRef.current = true;
  }, [user]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const payloadObj = {
      defaultBankrollId: defaultBankrollId || null,
      games: normalizeUnique(games),
      stakes: normalizeUnique(stakes),
      locations: normalizeUnique(locations),

      defaultGame: defaultGame || "",
      defaultStake: defaultStake || "",
      defaultLocation: defaultLocation || "",
    };

    const payloadKey = JSON.stringify({
      defaultBankrollId: defaultBankrollId || "",
      games: payloadObj.games,
      stakes: payloadObj.stakes,
      locations: payloadObj.locations,
      defaultGame: payloadObj.defaultGame,
      defaultStake: payloadObj.defaultStake,
      defaultLocation: payloadObj.defaultLocation,
    });

    if (payloadKey === lastSentRef.current) return;

    setSaveStatus("Saving…");
    setError("");

    const t = setTimeout(async () => {
      try {
        await updateSettings(payloadObj);
        lastSentRef.current = payloadKey;
        setSaveStatus("Saved");
        await refreshMe();
        setTimeout(() => setSaveStatus(""), 1000);
      } catch (e) {
        setSaveStatus("");
        setError(e.message || "Failed to save settings");
      }
    }, 500);

    return () => clearTimeout(t);
  }, [
    defaultBankrollId,
    games,
    stakes,
    locations,
    defaultGame,
    defaultStake,
    defaultLocation,
    refreshMe,
  ]);

  function onEnterDo(e, fn) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fn();
  }

  // ------- Bankroll actions -------
  function startEdit(b) {
    setEditId(b._id);
    setEditName(b.name ?? "");
    setEditCurrency(b.currency ?? "");
    setEditStarting(String(b.startingBankroll ?? 0));
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditCurrency("");
    setEditStarting("");
  }

  async function onSaveBankrollEdit(bankrollId) {
    const nm = editName.trim();
    const cur = editCurrency.trim().toUpperCase();
    const startNum = Number(editStarting);

    if (!nm) return setError("Bankroll name is required.");
    if (cur.length !== 3) return setError("Currency must be 3 letters (e.g., USD).");
    if (Number.isNaN(startNum) || startNum < 0) return setError("Starting bankroll must be a number ≥ 0.");

    setBusy(true);
    setError("");
    try {
      await updateBankroll(bankrollId, { name: nm, currency: cur, startingBankroll: startNum });
      await refreshMe();
      cancelEdit();
    } catch (e) {
      setError(e.message || "Failed to update bankroll");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteBankroll(bankrollId, name) {
    if (!confirm(`Delete bankroll "${name}"? This cannot be undone.`)) return;

    setBusy(true);
    setError("");
    try {
      await deleteBankroll(bankrollId);
      await refreshMe();
    } catch (e) {
      setError(e.message || "Failed to delete bankroll");
    } finally {
      setBusy(false);
    }
  }

  function openCreateModal() {
    setError("");
    setNewName("Main");
    setNewCurrency("USD");
    setNewStarting("1000");
    setShowCreate(true);
  }

  function closeCreateModal() {
    if (busy) return;
    setShowCreate(false);
  }

  async function onCreateBankrollModalSubmit(e) {
    e.preventDefault();

    const nm = newName.trim();
    const cur = newCurrency.trim().toUpperCase();
    const startNum = Number(String(newStarting).trim());

    if (!nm) return setError("Bankroll name is required.");
    if (cur.length !== 3) return setError("Currency must be 3 letters (e.g., USD).");
    if (Number.isNaN(startNum) || startNum < 0) return setError("Starting bankroll must be a number ≥ 0.");

    setBusy(true);
    setError("");
    try {
      await createBankroll({ name: nm, currency: cur, startingBankroll: startNum });
      await refreshMe();
      setShowCreate(false);
    } catch (e) {
      setError(e.message || "Failed to create bankroll");
    } finally {
      setBusy(false);
    }
  }

  // ------- Games/Stakes/Locations actions -------
  function addGame() {
    const v = gameInput.trim();
    if (!v) return;
    if (games.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setGames([...games, v]);
    setGameInput("");
  }
  function editGame(oldValue) {
    const next = prompt("Edit game", oldValue);
    if (next == null) return;
    const v = next.trim();
    if (!v) return;
    const nextGames = normalizeUnique(games.map((g) => (g === oldValue ? v : g)));
    setGames(nextGames);
    if (defaultGame && defaultGame.toLowerCase() === oldValue.toLowerCase()) setDefaultGame(v);
  }
  function removeGame(value) {
    const nextGames = games.filter((g) => g !== value);
    setGames(nextGames);
    if (defaultGame && defaultGame.toLowerCase() === value.toLowerCase()) setDefaultGame("");
  }

  function addStake() {
    const v = stakeInput.trim();
    if (!v) return;
    if (stakes.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setStakes([...stakes, v]);
    setStakeInput("");
  }
  function editStake(oldValue) {
    const next = prompt("Edit stake", oldValue);
    if (next == null) return;
    const v = next.trim();
    if (!v) return;
    const nextStakes = normalizeUnique(stakes.map((s) => (s === oldValue ? v : s)));
    setStakes(nextStakes);
    if (defaultStake && defaultStake.toLowerCase() === oldValue.toLowerCase()) setDefaultStake(v);
  }
  function removeStake(value) {
    const nextStakes = stakes.filter((s) => s !== value);
    setStakes(nextStakes);
    if (defaultStake && defaultStake.toLowerCase() === value.toLowerCase()) setDefaultStake("");
  }

  function addLocation() {
    const v = locationInput.trim();
    if (!v) return;
    if (locations.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setLocations([...locations, v]);
    setLocationInput("");
  }
  function editLocation(oldValue) {
    const next = prompt("Edit location", oldValue);
    if (next == null) return;
    const v = next.trim();
    if (!v) return;
    const nextLocations = normalizeUnique(locations.map((l) => (l === oldValue ? v : l)));
    setLocations(nextLocations);
    if (defaultLocation && defaultLocation.toLowerCase() === oldValue.toLowerCase()) setDefaultLocation(v);
  }
  function removeLocation(value) {
    const nextLocations = locations.filter((l) => l !== value);
    setLocations(nextLocations);
    if (defaultLocation && defaultLocation.toLowerCase() === value.toLowerCase()) setDefaultLocation("");
  }

  return (
    <div className={`${ui.page} ${ui.settingsGrid}`}>
      <div className={ui.headerRow}>
        <h1 className={ui.title}>Settings</h1>
        <div className={ui.subtle}>{saveStatus}</div>
      </div>

      {error && <div className={ui.errorBanner}>{error}</div>}

      {/* Bankrolls (span full width) */}
      <div className={`${ui.panel} ${ui.gridSpan2}`}>
        <div className={ui.sectionHeaderRow}>
          <h2 className={ui.sectionTitleText}>Bankrolls</h2>
          <button className={`${ui.button} ${ui.buttonNoShrink}`} type="button" onClick={openCreateModal} disabled={busy}>
            Create Bankroll
          </button>
        </div>

        <div className={ui.controlsTight}>
          <label className={ui.fieldTight}>
            <span className={ui.label}>Default bankroll</span>
            <select
              className={`${ui.select} ${ui.selectCompact}`}
              value={defaultBankrollId}
              onChange={(e) => setDefaultBankrollId(e.target.value)}
              disabled={busy || bankrolls.length === 0}
            >
              <option value="">None</option>
              {bankrolls.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.currency})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={ui.tableWrap}>
          {bankrolls.length === 0 ? (
            <div className={ui.subtle}>No bankrolls yet. Use “Create Bankroll” to add one.</div>
          ) : (
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Name</th>
                  <th className={ui.th}>Currency</th>
                  <th className={ui.th}>Starting</th>
                  <th className={ui.thRight}></th>
                </tr>
              </thead>
              <tbody>
                {bankrolls.map((b) => {
                  const isEditing = editId === b._id;
                  return (
                    <tr key={b._id} className={ui.tr}>
                      <td className={ui.td}>
                        {isEditing ? (
                          <input className={ui.input} value={editName} onChange={(e) => setEditName(e.target.value)} disabled={busy} />
                        ) : (
                          b.name
                        )}
                      </td>

                      <td className={ui.td}>
                        {isEditing ? (
                          <input className={ui.input} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} disabled={busy} />
                        ) : (
                          b.currency
                        )}
                      </td>

                      <td className={ui.td}>
                        {isEditing ? (
                          <input className={ui.input} type="number" min="0" step="0.01" value={editStarting} onChange={(e) => setEditStarting(e.target.value)} disabled={busy} />
                        ) : (
                          b.startingBankroll
                        )}
                      </td>

                      <td className={ui.tdRight}>
                        {isEditing ? (
                          <div className={ui.rowActions}>
                            <button className={ui.button} type="button" onClick={() => onSaveBankrollEdit(b._id)} disabled={busy}>
                              Save
                            </button>
                            <button className={ui.ghostButton} type="button" onClick={cancelEdit} disabled={busy}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className={ui.rowActions}>
                            <button className={ui.ghostButton} type="button" onClick={() => startEdit(b)} disabled={busy}>
                              Edit
                            </button>
                            <button className={ui.dangerButton} type="button" onClick={() => onDeleteBankroll(b._id, b.name)} disabled={busy}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Masonry area (Games/Stakes/Locations) */}
      <div className={`${ui.gridSpan2} ${ui.prefsMasonry}`}>
        {/* Games */}
        <div className={`${ui.panel} ${ui.prefsCard}`}>
          <div className={ui.sectionHeaderRow}>
            <h2 className={ui.sectionTitleText}>Games</h2>
          </div>

          <label className={ui.fieldTight}>
            <span className={ui.label}>Default game</span>
            <select className={`${ui.select} ${ui.selectCompact}`} value={defaultGame} onChange={(e) => setDefaultGame(e.target.value)} disabled={busy}>
              <option value="">None</option>
              {games.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <div className={ui.controlsTight}>
            <label className={ui.field} style={{ flex: 1 }}>
              <input
                className={ui.input}
                value={gameInput}
                onChange={(e) => setGameInput(e.target.value)}
                onKeyDown={(e) => onEnterDo(e, addGame)}
                placeholder='Add a new game - e.g. "Big O"'
                disabled={busy}
              />
            </label>
            <button className={`${ui.button} ${ui.buttonNoShrink}`} type="button" onClick={addGame} disabled={busy}>
              Add
            </button>
          </div>

          <div className={ui.tableWrap}>
            {games.length === 0 ? (
              <div className={ui.subtle}>No games yet.</div>
            ) : (
              <table className={ui.table}>
                <tbody>
                  {games.map((g) => (
                    <tr key={g} className={ui.tr}>
                      <td className={ui.td}>{g}</td>
                      <td className={ui.tdRight}>
                        <div className={ui.rowActions}>
                          <button className={ui.ghostButton} type="button" onClick={() => editGame(g)} disabled={busy}>
                            Edit
                          </button>
                          <button className={ui.dangerButton} type="button" onClick={() => removeGame(g)} disabled={busy}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stakes */}
        <div className={`${ui.panel} ${ui.prefsCard}`}>
          <div className={ui.sectionHeaderRow}>
            <h2 className={ui.sectionTitleText}>Stakes</h2>
          </div>

          <label className={ui.fieldTight}>
            <span className={ui.label}>Default stake</span>
            <select className={`${ui.select} ${ui.selectCompact}`} value={defaultStake} onChange={(e) => setDefaultStake(e.target.value)} disabled={busy}>
              <option value="">None</option>
              {stakes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className={ui.controlsTight}>
            <label className={ui.field} style={{ flex: 1 }}>
              <input
                className={ui.input}
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                onKeyDown={(e) => onEnterDo(e, addStake)}
                placeholder='Add a new Stake - "1/2", "2/5", "NL50"'
                disabled={busy}
              />
            </label>
            <button className={`${ui.button} ${ui.buttonNoShrink}`} type="button" onClick={addStake} disabled={busy}>
              Add
            </button>
          </div>

          <div className={ui.tableWrap}>
            {stakes.length === 0 ? (
              <div className={ui.subtle}>No stakes yet.</div>
            ) : (
              <table className={ui.table}>
                <tbody>
                  {stakes.map((s) => (
                    <tr key={s} className={ui.tr}>
                      <td className={ui.td}>{s}</td>
                      <td className={ui.tdRight}>
                        <div className={ui.rowActions}>
                          <button className={ui.ghostButton} type="button" onClick={() => editStake(s)} disabled={busy}>
                            Edit
                          </button>
                          <button className={ui.dangerButton} type="button" onClick={() => removeStake(s)} disabled={busy}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Locations */}
        <div className={`${ui.panel} ${ui.prefsCard}`}>
          <div className={ui.sectionHeaderRow}>
            <h2 className={ui.sectionTitleText}>Locations</h2>
          </div>

          <label className={ui.fieldTight}>
            <span className={ui.label}>Default location</span>
            <select className={`${ui.select} ${ui.selectCompact}`} value={defaultLocation} onChange={(e) => setDefaultLocation(e.target.value)} disabled={busy}>
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <div className={ui.controlsTight}>
            <label className={ui.field} style={{ flex: 1 }}>
              <input
                className={ui.input}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => onEnterDo(e, addLocation)}
                placeholder='Add a new location - "Bellagio", "Home Game"'
                disabled={busy}
              />
            </label>
            <button className={`${ui.button} ${ui.buttonNoShrink}`} type="button" onClick={addLocation} disabled={busy}>
              Add
            </button>
          </div>

          <div className={ui.tableWrap}>
            {locations.length === 0 ? (
              <div className={ui.subtle}>No locations yet.</div>
            ) : (
              <table className={ui.table}>
                <tbody>
                  {locations.map((l) => (
                    <tr key={l} className={ui.tr}>
                      <td className={ui.td}>{l}</td>
                      <td className={ui.tdRight}>
                        <div className={ui.rowActions}>
                          <button className={ui.ghostButton} type="button" onClick={() => editLocation(l)} disabled={busy}>
                            Edit
                          </button>
                          <button className={ui.dangerButton} type="button" onClick={() => removeLocation(l)} disabled={busy}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Bankroll Modal */}
      {showCreate && (
        <div className={ui.modalOverlay} role="dialog" aria-modal="true" onMouseDown={closeCreateModal}>
          <div className={ui.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={ui.modalHeader}>
              <h2 className={ui.modalTitle}>Create bankroll</h2>
              <button className={ui.ghostButton} type="button" onClick={closeCreateModal} disabled={busy}>
                ✕
              </button>
            </div>

            <form className={ui.modalForm} onSubmit={onCreateBankrollModalSubmit}>
              <label className={ui.field}>
                <span className={ui.label}>Name</span>
                <input className={ui.input} value={newName} onChange={(e) => setNewName(e.target.value)} disabled={busy} autoFocus />
              </label>

              <div className={ui.modalRow2}>
                <label className={ui.field}>
                  <span className={ui.label}>Currency</span>
                  <input className={ui.input} value={newCurrency} onChange={(e) => setNewCurrency(e.target.value.toUpperCase())} disabled={busy} />
                </label>

                <label className={ui.field}>
                  <span className={ui.label}>Starting</span>
                  <input className={ui.input} type="number" min="0" step="0.01" value={newStarting} onChange={(e) => setNewStarting(e.target.value)} disabled={busy} />
                </label>
              </div>

              <div className={ui.modalActions}>
                <button className={ui.ghostButton} type="button" onClick={closeCreateModal} disabled={busy}>
                  Cancel
                </button>
                <button className={ui.button} type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create"}
                </button>
              </div>

              <div className={ui.subtle}>Bankroll names must be unique.</div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}