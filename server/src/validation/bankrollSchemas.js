import { z } from "zod";

const currencyCode = z.string().min(3).max(3).transform((s) => s.toUpperCase());

export const upsertBankrollSchema = z.object({
  currency: currencyCode,
  startingBankroll: z.number().min(0),
});