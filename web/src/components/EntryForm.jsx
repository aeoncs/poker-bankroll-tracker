import { useEffect, useMemo, useRef, useState } from "react";
import ui from "../styles/ui.module.css";

function localTodayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateTimeLocalValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(v) {
  if (!v) return null;
  const d = new Date(v); 
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDurationFromSeconds(sec) {
  if (sec == null) return "—";
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function EntryForm({
  mode = "create",
  bankrolls = [],
  initialValues = null,
  onSubmit,
  onCancel,
  gameOptions = [],
  stakeOptions = [],
  locationOptions = [],
  defaultGame = "",
  defaultStake = "",
  defaultLocation = "",
}) {
  const defaultBankrollId = bankrolls[0]?._id || "";

  const [bankrollId, setBankrollId] = useState(defaultBankrollId);

  const [type, setType] = useState("CASH");

  const [date, setDate] = useState(localTodayYYYYMMDD());

  const [game, setGame] = useState(mode === "create" ? (defaultGame || "") : "");
  const [stake, setStake] = useState(mode === "create" ? (defaultStake || "") : "");
  const [location, setLocation] = useState(mode === "create" ? (defaultLocation || "") : "");
  const [notes, setNotes] = useState("");

  // datetime-local strings
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [endTimeLocal, setEndTimeLocal] = useState("");

  // CASH
  const [buyIn, setBuyIn] = useState(0);
  const [cashOut, setCashOut] = useState(0);

  // TOURNEY
  const [fee, setFee] = useState(0);
  const [rebuys, setRebuys] = useState(0);
  const [addons, setAddons] = useState(0);
  const [winnings, setWinnings] = useState(0);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Timer display state 
  const [sessionRunning, setSessionRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);

  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Timer refs
  const sessionRunningRef = useRef(false);
  const onBreakRef = useRef(false);

  const activeCommittedRef = useRef(0);
  const breakCommittedRef = useRef(0);

  const activeStartMsRef = useRef(null);
  const breakStartMsRef = useRef(null);

  const intervalRef = useRef(null);

  const selectedBankroll = useMemo(
    () => bankrolls.find((b) => b._id === bankrollId) || null,
    [bankrolls, bankrollId]
  );
  const currency = selectedBankroll?.currency || "";

  const startISO = useMemo(() => fromDateTimeLocalValue(startTimeLocal), [startTimeLocal]);
  const endISO = useMemo(() => fromDateTimeLocalValue(endTimeLocal), [endTimeLocal]);

  const durationMinutes = useMemo(() => Math.floor(sessionSeconds / 60), [sessionSeconds]);

  const profitPreview = useMemo(() => {
    const bi = Number(buyIn) || 0;
    if (type === "CASH") return (Number(cashOut) || 0) - bi;
    return (Number(winnings) || 0) - (bi + (Number(fee) || 0) + (Number(rebuys) || 0) + (Number(addons) || 0));
  }, [type, buyIn, cashOut, winnings, fee, rebuys, addons]);

  useEffect(() => {
    sessionRunningRef.current = sessionRunning;
  }, [sessionRunning]);

  useEffect(() => {
    onBreakRef.current = onBreak;
  }, [onBreak]);

  useEffect(() => {
    if (!bankrollId && defaultBankrollId) setBankrollId(defaultBankrollId);
 
  }, [defaultBankrollId]);

  // apply defaults if they change (create mode only)
  useEffect(() => {
    if (mode !== "create") return;
    if (!initialValues) {
      if (!game && defaultGame) setGame(defaultGame);
      if (!stake && defaultStake) setStake(defaultStake);
      if (!location && defaultLocation) setLocation(defaultLocation);
    }

  }, [defaultGame, defaultStake, defaultLocation]);

  // timer ticks (only relevant when create)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!sessionRunningRef.current) return;

      const now = Date.now();

      if (onBreakRef.current) {
        const b0 = breakStartMsRef.current;
        const liveBreak = b0 ? Math.max(0, Math.floor((now - b0) / 1000)) : 0;
        setBreakSeconds(breakCommittedRef.current + liveBreak);
        setSessionSeconds(activeCommittedRef.current);
      } else {
        const a0 = activeStartMsRef.current;
        const liveActive = a0 ? Math.max(0, Math.floor((now - a0) / 1000)) : 0;
        setSessionSeconds(activeCommittedRef.current + liveActive);
        setBreakSeconds(breakCommittedRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function nowDateTimeLocal() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  // Pre-fill when editing
  useEffect(() => {
    if (!initialValues) return;

    setBankrollId(initialValues.bankrollId);
    setType(initialValues.type);
    setDate(toDateInputValue(initialValues.date) || localTodayYYYYMMDD());

    setGame(initialValues.game || "");
    setStake(initialValues.stake || initialValues.stakes || "");
    setLocation(initialValues.location || "");
    setNotes(initialValues.notes || "");

    setStartTimeLocal(toDateTimeLocalValue(initialValues.startTime));
    setEndTimeLocal(toDateTimeLocalValue(initialValues.endTime));

    setBuyIn(initialValues.buyIn ?? 0);

    if (initialValues.type === "CASH") {
      setCashOut(initialValues.cashOut ?? 0);
      setFee(0);
      setRebuys(0);
      setAddons(0);
      setWinnings(0);
    } else {
      setFee(initialValues.fee ?? 0);
      setRebuys(initialValues.rebuys ?? 0);
      setAddons(initialValues.addons ?? 0);
      setWinnings(initialValues.winnings ?? 0);
      setCashOut(0);
    }

    const mins = initialValues.durationMinutes ?? null;
    const activeSec = mins != null ? Math.max(0, Number(mins) * 60) : 0;

    setSessionSeconds(activeSec);
    setBreakSeconds(0);

    activeCommittedRef.current = activeSec;
    breakCommittedRef.current = 0;
    activeStartMsRef.current = null;
    breakStartMsRef.current = null;

    setSessionRunning(false);
    setOnBreak(false);
  }, [initialValues?._id]);

  // Resync timers when user manually edits start/end
  useEffect(() => {
    if (!startISO || !endISO) return;

    const a = new Date(startISO).getTime();
    const b = new Date(endISO).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;

    const totalSec = Math.max(0, Math.floor((b - a) / 1000));

    const now = Date.now();
    const liveBreak =
      onBreakRef.current && breakStartMsRef.current
        ? Math.max(0, Math.floor((now - breakStartMsRef.current) / 1000))
        : 0;

    const currentBreakTotal = breakCommittedRef.current + liveBreak;
    const newActive = Math.max(0, totalSec - currentBreakTotal);

    setSessionSeconds(newActive);
    setBreakSeconds(currentBreakTotal);

    activeCommittedRef.current = newActive;

    if (sessionRunningRef.current) {
      if (onBreakRef.current) {
        breakCommittedRef.current = currentBreakTotal;
        breakStartMsRef.current = now;
        activeStartMsRef.current = null;
      } else {
        activeStartMsRef.current = now;
        breakStartMsRef.current = null;
      }
    }
  }, [startISO, endISO]);

  function startSession() {
    setError("");

    if (!startTimeLocal) {
      setStartTimeLocal(nowDateTimeLocal());
    }

    if (sessionRunningRef.current) return;

    setSessionRunning(true);
    setOnBreak(false);

    onBreakRef.current = false;
    sessionRunningRef.current = true;

    activeStartMsRef.current = Date.now();
    breakStartMsRef.current = null;
  }

  function toggleBreak() {
    if (!sessionRunningRef.current) return;

    const now = Date.now();

    if (!onBreakRef.current) {
      const a0 = activeStartMsRef.current;
      const liveActive = a0 ? Math.max(0, Math.floor((now - a0) / 1000)) : 0;
      activeCommittedRef.current += liveActive;
      setSessionSeconds(activeCommittedRef.current);

      activeStartMsRef.current = null;

      onBreakRef.current = true;
      setOnBreak(true);
      breakStartMsRef.current = now;
    } else {
      const b0 = breakStartMsRef.current;
      const liveBreak = b0 ? Math.max(0, Math.floor((now - b0) / 1000)) : 0;
      breakCommittedRef.current += liveBreak;
      setBreakSeconds(breakCommittedRef.current);

      breakStartMsRef.current = null;

      onBreakRef.current = false;
      setOnBreak(false);
      activeStartMsRef.current = now;
    }
  }

  // endSession is used in create mode only UI, but kept here
  function endSession() {
    setError("");

    const now = Date.now();
    const nowLocal = nowDateTimeLocal();

    const effectiveStartLocal = startTimeLocal || nowLocal;
    if (!startTimeLocal) setStartTimeLocal(effectiveStartLocal);

    setEndTimeLocal(nowLocal);

    if (sessionRunningRef.current) {
      if (onBreakRef.current) {
        const b0 = breakStartMsRef.current;
        const liveBreak = b0 ? Math.max(0, Math.floor((now - b0) / 1000)) : 0;
        breakCommittedRef.current += liveBreak;
        setBreakSeconds(breakCommittedRef.current);
        breakStartMsRef.current = null;
      } else {
        const a0 = activeStartMsRef.current;
        const liveActive = a0 ? Math.max(0, Math.floor((now - a0) / 1000)) : 0;
        activeCommittedRef.current += liveActive;
        setSessionSeconds(activeCommittedRef.current);
        activeStartMsRef.current = null;
      }

      sessionRunningRef.current = false;
      onBreakRef.current = false;
      setSessionRunning(false);
      setOnBreak(false);
    }

    const startISO2 = fromDateTimeLocalValue(effectiveStartLocal);
    const endISO2 = fromDateTimeLocalValue(nowLocal);

    if (startISO2 && endISO2) {
      const a = new Date(startISO2).getTime();
      const b = new Date(endISO2).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
        const totalSec = Math.max(0, Math.floor((b - a) / 1000));
        const breakTotal = breakCommittedRef.current;
        const activeSec = Math.max(0, totalSec - breakTotal);

        activeCommittedRef.current = activeSec;
        setSessionSeconds(activeSec);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (!bankrollId) throw new Error("Please select a bankroll");
      if (type === "CASH" && !stake.trim()) throw new Error("Stake is required for cash sessions.");

      if (startISO && endISO) {
        const a = new Date(startISO).getTime();
        const b = new Date(endISO).getTime();
        if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid start/end time.");
        if (b <= a) throw new Error("End time must be after start time.");
      }

      const sessionDate = (startTimeLocal && startTimeLocal.slice(0, 10)) || date || localTodayYYYYMMDD();

      const base = {
        bankrollId,
        type,
        date: sessionDate,
        game: game.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        stakes: stake.trim() || undefined, // backend expects `stakes`
        startTime: startISO || undefined,
        endTime: endISO || undefined,
        ...(durationMinutes > 0 ? { durationMinutes } : {}),
      };

      const payload =
        type === "CASH"
          ? { ...base, buyIn: Number(buyIn), cashOut: Number(cashOut) }
          : { ...base, buyIn: Number(buyIn), fee: Number(fee), rebuys: Number(rebuys), addons: Number(addons), winnings: Number(winnings) };

      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={ui.formStack}>
      {/* Hide timer controls in edit mode */}
      {mode !== "edit" && (
        <div className={ui.timerBar}>
          <div className={ui.timerStats}>
            <div className={ui.smallMuted}>
              Session: <strong>{formatDurationFromSeconds(sessionSeconds)}</strong>
            </div>
            <div className={ui.smallMuted}>
              Break: <strong>{formatDurationFromSeconds(breakSeconds)}</strong>
            </div>
            <div className={ui.smallMuted}>
              Active minutes: <strong>{durationMinutes}</strong>
            </div>
          </div>

          <div className={ui.timerActions}>
            <button className={ui.button} type="button" onClick={startSession} disabled={busy || sessionRunning}>
              Start session
            </button>

            <button className={ui.ghostButton} type="button" onClick={toggleBreak} disabled={busy || !sessionRunning}>
              {onBreak ? "Resume" : "Break"}
            </button>

            <button className={ui.dangerButton} type="button" onClick={endSession} disabled={busy}>
              End session
            </button>
          </div>
        </div>
      )}

      <div className={ui.formRow2}>
        <label className={ui.field}>
          <span className={ui.label}>Bankroll</span>
          <select className={ui.select} value={bankrollId} onChange={(e) => setBankrollId(e.target.value)}>
            {bankrolls.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.currency})
              </option>
            ))}
          </select>
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Type</span>
          {/* no lock in edit mode */}
          <select className={ui.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="TOURNEY">Tourney</option>
          </select>
        </label>
      </div>

      <div className={ui.smallMuted}>
        Currency: <strong>{currency || "—"}</strong>
      </div>

      <div className={ui.formRow2}>
        <label className={ui.field}>
          <span className={ui.label}>Start time</span>
          <input className={ui.input} type="datetime-local" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>End time</span>
          <input className={ui.input} type="datetime-local" value={endTimeLocal} onChange={(e) => setEndTimeLocal(e.target.value)} />
        </label>
      </div>

      <div className={ui.formRow3}>
        <label className={ui.field}>
          <span className={ui.label}>Game</span>
          <select className={ui.select} value={game} onChange={(e) => setGame(e.target.value)}>
            <option value="">—</option>
            {gameOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Stake {type === "CASH" ? "(required)" : ""}</span>
          <select className={ui.select} value={stake} onChange={(e) => setStake(e.target.value)} required={type === "CASH"}>
            <option value="">—</option>
            {stakeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Location</span>
          <select className={ui.select} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">—</option>
            {locationOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === "CASH" ? (
        <div className={ui.formRow3}>
          <label className={ui.field}>
            <span className={ui.label}>Buy-in</span>
            <input className={ui.input} type="number" step="0.01" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
          </label>

          <label className={ui.field}>
            <span className={ui.label}>Cash-out</span>
            <input className={ui.input} type="number" step="0.01" value={cashOut} onChange={(e) => setCashOut(e.target.value)} />
          </label>

          <div className={ui.card}>
            <div className={ui.cardTitle}>Profit preview</div>
            <div className={ui.cardValue}>
              {profitPreview} {currency}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={ui.formRow3}>
            <label className={ui.field}>
              <span className={ui.label}>Buy-in</span>
              <input className={ui.input} type="number" step="0.01" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
            </label>

            <label className={ui.field}>
              <span className={ui.label}>Fee</span>
              <input className={ui.input} type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
            </label>

            <label className={ui.field}>
              <span className={ui.label}>Winnings</span>
              <input className={ui.input} type="number" step="0.01" value={winnings} onChange={(e) => setWinnings(e.target.value)} />
            </label>
          </div>

          <div className={ui.formRow3}>
            <label className={ui.field}>
              <span className={ui.label}>Rebuys</span>
              <input className={ui.input} type="number" step="0.01" value={rebuys} onChange={(e) => setRebuys(e.target.value)} />
            </label>

            <label className={ui.field}>
              <span className={ui.label}>Add-ons</span>
              <input className={ui.input} type="number" step="0.01" value={addons} onChange={(e) => setAddons(e.target.value)} />
            </label>

            <div className={ui.card}>
              <div className={ui.cardTitle}>Profit preview</div>
              <div className={ui.cardValue}>
                {profitPreview} {currency}
              </div>
            </div>
          </div>
        </>
      )}

      <label className={ui.field}>
        <span className={ui.label}>Notes</span>
        <textarea className={ui.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
      </label>

      {error && <div className={ui.errorBanner}>{error}</div>}

      <div className={ui.formActions}>
        <button disabled={busy} className={ui.button} type="submit">
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className={ui.ghostButton} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}