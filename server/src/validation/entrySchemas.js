import { z } from "zod";

const currencyCode = z.string().min(3).max(3).transform((s) => s.toUpperCase());

// Accept either ISO string or Date
const dateish = z.coerce.date();

const baseFields = {
  bankrollId: z.string().min(1),
  type: z.enum(["CASH", "TOURNEY"]),
  date: dateish,

  // server enforces from bankroll; keep for backwards compatibility
  currency: currencyCode.optional(),

  game: z.string().trim().max(50).optional(),
  startTime: dateish.optional(),
  endTime: dateish.optional(),

  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().max(30)).optional(),
};

export const cashEntrySchema = z.object({
  ...baseFields,
  type: z.literal("CASH"),
  stakes: z.string().trim().min(1).max(20).optional(), 
  buyIn: z.number().min(0),
  cashOut: z.number().min(0),
  durationMinutes: z.number().int().min(0).optional(), 
});

export const tourneyEntrySchema = z.object({
  ...baseFields,
  type: z.literal("TOURNEY"),
  buyIn: z.number().min(0),
  fee: z.number().min(0).default(0),
  rebuys: z.number().min(0).default(0),
  addons: z.number().min(0).default(0),
  winnings: z.number().min(0).default(0),
  finishPosition: z.number().int().min(1).optional(),
  entrants: z.number().int().min(1).optional(),
  durationMinutes: z.number().int().min(0).optional(), 
});

export function parseEntry(body) {
  if (body?.type === "CASH") return cashEntrySchema.parse(body);
  if (body?.type === "TOURNEY") return tourneyEntrySchema.parse(body);
  const err = new Error("Invalid entry type");
  err.status = 400;
  throw err;
}