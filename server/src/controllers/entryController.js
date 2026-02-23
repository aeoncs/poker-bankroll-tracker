import mongoose from "mongoose";
import { Entry } from "../models/Entry.js";
import { User } from "../models/User.js";
import { parseEntry } from "../validation/entrySchemas.js";

function sendZodError(res, err) {
  if (err?.name === "ZodError") {
    return res.status(400).json({ message: "Invalid input", details: err.errors });
  }
  return null;
}

async function getUserBankrollOr400(userId, bankrollId) {
  const user = await User.findById(userId).select("bankrolls");
  if (!user) return { status: 404, body: { message: "User not found" } };

  const bankroll = user.bankrolls.id(bankrollId);
  if (!bankroll) return { status: 400, body: { message: "Invalid bankrollId" } };

  return { user, bankroll };
}

function computeDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const a = new Date(startTime).getTime();
  const b = new Date(endTime).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = Math.round((b - a) / 60000);
  if (mins < 0) return null;
  return mins;
}

function toSessionJson(doc) {
  // Convert mongoose doc to plain object and add aliases
  const o = doc.toObject ? doc.toObject() : doc;

  return {
    ...o,
    // alias for UI
    stake: o.stakes ?? "",
  };
}

export async function createEntry(req, res, next) {
  try {
    const data = parseEntry(req.body);

    const { bankroll, status, body } = await getUserBankrollOr400(req.user.id, data.bankrollId);
    if (status) return res.status(status).json(body);

    // Auto duration if start/end provided and durationMinutes not present
    const computedDuration =
      data.durationMinutes != null ? data.durationMinutes : computeDurationMinutes(data.startTime, data.endTime);

    const entry = await Entry.create({
      ...data,
      durationMinutes: computedDuration ?? data.durationMinutes,
      userId: req.user.id,
      bankrollId: new mongoose.Types.ObjectId(data.bankrollId),
      currency: bankroll.currency,
    });

    res.status(201).json({ entry: toSessionJson(entry) });
  } catch (err) {
    if (sendZodError(res, err)) return;
    next(err);
  }
}

export async function listEntries(req, res, next) {
  try {
    const {
      bankrollId,
      type,
      start,
      end,
      location,
      game,
      stakes,
      minBuyIn,
      maxBuyIn,
      q,
    } = req.query;

    const filter = { userId: req.user.id };

    if (bankrollId) filter.bankrollId = new mongoose.Types.ObjectId(String(bankrollId));
    if (type) filter.type = String(type).toUpperCase();

    if (location) filter.location = { $regex: String(location), $options: "i" };
    if (game) filter.game = { $regex: String(game), $options: "i" };
    if (stakes) filter.stakes = { $regex: String(stakes), $options: "i" };

    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(String(start));
      if (end) filter.date.$lte = new Date(String(end));
    }

    // Buy-in range (works for both CASH + TOURNEY where buyIn exists)
    const minB = minBuyIn == null || minBuyIn === "" ? null : Number(minBuyIn);
    const maxB = maxBuyIn == null || maxBuyIn === "" ? null : Number(maxBuyIn);
    if (Number.isFinite(minB) || Number.isFinite(maxB)) {
      filter.buyIn = {};
      if (Number.isFinite(minB)) filter.buyIn.$gte = minB;
      if (Number.isFinite(maxB)) filter.buyIn.$lte = maxB;
    }

    // Free-text search across a few fields
    if (q) {
      const term = String(q).trim();
      if (term) {
        filter.$or = [
          { notes: { $regex: term, $options: "i" } },
          { location: { $regex: term, $options: "i" } },
          { game: { $regex: term, $options: "i" } },
          { stakes: { $regex: term, $options: "i" } },
          { type: { $regex: term, $options: "i" } },
        ];
      }
    }

    const entries = await Entry.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(500);

    res.json({ entries: entries.map(toSessionJson) });
  } catch (err) {
    next(err);
  }
}

export async function getEntry(req, res, next) {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ entry: toSessionJson(entry) });
  } catch (err) {
    next(err);
  }
}

export async function updateEntry(req, res, next) {
  try {
    const data = parseEntry(req.body);

    const { bankroll, status, body } = await getUserBankrollOr400(req.user.id, data.bankrollId);
    if (status) return res.status(status).json(body);

    const computedDuration =
      data.durationMinutes != null ? data.durationMinutes : computeDurationMinutes(data.startTime, data.endTime);

    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: {
          ...data,
          durationMinutes: computedDuration ?? data.durationMinutes,
          bankrollId: new mongoose.Types.ObjectId(data.bankrollId),
          currency: bankroll.currency,
        },
      },
      { new: true }
    );

    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ entry: toSessionJson(entry) });
  } catch (err) {
    if (sendZodError(res, err)) return;
    next(err);
  }
}

export async function deleteEntry(req, res, next) {
  try {
    const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}