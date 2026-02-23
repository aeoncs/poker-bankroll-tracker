import { User } from "../models/User.js";
import { z } from "zod";
import mongoose from "mongoose";

const currencyCode = z.string().min(3).max(3).transform((s) => s.toUpperCase());

const normalizeUnique = (arr) => {
  const seen = new Set();
  const out = [];
  for (const raw of arr || []) {
    const v = String(raw || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
};

const updateSettingsSchema = z.object({
  defaultBankrollId: z.string().nullable().optional(),

  games: z.array(z.string().trim().min(1).max(50)).optional(),
  stakes: z.array(z.string().trim().min(1).max(30)).optional(),
  locations: z.array(z.string().trim().min(1).max(60)).optional(),

  // defaults (empty string means "None")
  defaultGame: z.string().trim().max(50).optional(),
  defaultStake: z.string().trim().max(30).optional(),
  defaultLocation: z.string().trim().max(60).optional(),
});

export async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select(
      "defaultBankrollId bankrolls email stakes locations games defaultGame defaultStake defaultLocation"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      settings: {
        defaultBankrollId: user.defaultBankrollId ? user.defaultBankrollId.toString() : null,
        defaultGame: user.defaultGame || "",
        defaultStake: user.defaultStake || "",
        defaultLocation: user.defaultLocation || "",
      },
      bankrolls: user.bankrolls,
      games: user.games || [],
      stakes: user.stakes || [],
      locations: user.locations || [],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const parsed = updateSettingsSchema.parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // default bankroll
    if (parsed.defaultBankrollId === null) {
      user.defaultBankrollId = null;
    } else if (typeof parsed.defaultBankrollId === "string") {
      const bankroll = user.bankrolls.id(parsed.defaultBankrollId);
      if (!bankroll) return res.status(400).json({ message: "Invalid defaultBankrollId" });
      user.defaultBankrollId = new mongoose.Types.ObjectId(parsed.defaultBankrollId);
    }

    // lists
    if (parsed.games) user.games = normalizeUnique(parsed.games);
    if (parsed.stakes) user.stakes = normalizeUnique(parsed.stakes);
    if (parsed.locations) user.locations = normalizeUnique(parsed.locations);

    // defaults (empty string means None)
    if (typeof parsed.defaultGame === "string") user.defaultGame = parsed.defaultGame;
    if (typeof parsed.defaultStake === "string") user.defaultStake = parsed.defaultStake;
    if (typeof parsed.defaultLocation === "string") user.defaultLocation = parsed.defaultLocation;

    // ensure defaults still exist in their lists (otherwise clear them)
    if (user.defaultGame && !user.games.some((g) => g.toLowerCase() === user.defaultGame.toLowerCase())) {
      user.defaultGame = "";
    }
    if (user.defaultStake && !user.stakes.some((s) => s.toLowerCase() === user.defaultStake.toLowerCase())) {
      user.defaultStake = "";
    }
    if (user.defaultLocation && !user.locations.some((l) => l.toLowerCase() === user.defaultLocation.toLowerCase())) {
      user.defaultLocation = "";
    }

    await user.save();

    res.json({
      settings: {
        defaultBankrollId: user.defaultBankrollId ? user.defaultBankrollId.toString() : null,
        defaultGame: user.defaultGame || "",
        defaultStake: user.defaultStake || "",
        defaultLocation: user.defaultLocation || "",
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", details: err.errors });
    }
    next(err);
  }
}

const createBankrollSchema = z.object({
  name: z.string().trim().min(1).max(50),
  currency: currencyCode,
  startingBankroll: z.number().min(0),
});

const updateBankrollSchema = z.object({
  name: z.string().trim().min(1).max(50),
  currency: currencyCode,
  startingBankroll: z.number().min(0),
});

function hasDuplicateBankrollName(bankrolls, name, ignoreId = null) {
  const target = name.trim().toLowerCase();
  return bankrolls.some((b) => {
    if (ignoreId && b._id.toString() === ignoreId.toString()) return false;
    return (b.name || "").trim().toLowerCase() === target;
  });
}

export async function listBankrolls(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("bankrolls email createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ bankrolls: user.bankrolls });
  } catch (err) {
    next(err);
  }
}

export async function createBankroll(req, res, next) {
  try {
    const parsed = createBankrollSchema.parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (hasDuplicateBankrollName(user.bankrolls, parsed.name)) {
      return res.status(409).json({ message: "Bankroll name already exists. Please choose a unique name." });
    }

    user.bankrolls.push(parsed);

    if (!user.defaultBankrollId && user.bankrolls.length === 1) {
      user.defaultBankrollId = user.bankrolls[0]._id;
    }

    await user.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid input", details: err.errors });
    next(err);
  }
}

export async function updateBankroll(req, res, next) {
  try {
    const parsed = updateBankrollSchema.parse(req.body);
    const { bankrollId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bankroll = user.bankrolls.id(bankrollId);
    if (!bankroll) return res.status(404).json({ message: "Bankroll not found" });

    if (hasDuplicateBankrollName(user.bankrolls, parsed.name, bankrollId)) {
      return res.status(409).json({ message: "Bankroll name already exists. Please choose a unique name." });
    }

    bankroll.name = parsed.name;
    bankroll.currency = parsed.currency;
    bankroll.startingBankroll = parsed.startingBankroll;

    await user.save();
    res.json({ ok: true });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid input", details: err.errors });
    next(err);
  }
}

const setupSchema = z.object({
  bankroll: z.object({
    name: z.string().trim().min(1).max(50),
    currency: currencyCode,
    startingBankroll: z.number().min(0),
  }),
  theme: z.enum(["dark", "light"]),
  games: z.array(z.string().trim().min(1).max(50)).default([]),
  stakes: z.array(z.string().trim().min(1).max(30)).default([]),
  locations: z.array(z.string().trim().min(1).max(60)).default([]),
});

export async function completeSetup(req, res, next) {
  try {
    const parsed = setupSchema.parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (hasDuplicateBankrollName(user.bankrolls, parsed.bankroll.name)) {
      return res.status(409).json({ message: "Bankroll name already exists. Please choose a unique name." });
    }

    user.bankrolls.push(parsed.bankroll);

    if (!user.defaultBankrollId && user.bankrolls.length === 1) {
      user.defaultBankrollId = user.bankrolls[0]._id;
    }

    user.theme = parsed.theme;

    user.games = normalizeUnique(parsed.games);
    user.stakes = normalizeUnique(parsed.stakes);
    user.locations = normalizeUnique(parsed.locations);

    // ✅ set defaults automatically to first option (or "")
    user.defaultGame = user.games[0] || "";
    user.defaultStake = user.stakes[0] || "";
    user.defaultLocation = user.locations[0] || "";

    user.onboardingCompleted = true;

    await user.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid input", details: err.errors });
    next(err);
  }
}

export async function deleteBankroll(req, res, next) {
  try {
    const { bankrollId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const bankroll = user.bankrolls.id(bankrollId);
    if (!bankroll) return res.status(404).json({ message: "Bankroll not found" });

    bankroll.deleteOne();

    if (user.defaultBankrollId && user.defaultBankrollId.toString() === bankrollId.toString()) {
      user.defaultBankrollId = user.bankrolls.length ? user.bankrolls[0]._id : null;
    }

    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}