import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // entries belong to a bankroll
    bankrollId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    type: { type: String, required: true, enum: ["CASH", "TOURNEY"] },

    // Use date as the "session day" (kept for stats + grouping)
    date: { type: Date, required: true },

    currency: { type: String, required: true, uppercase: true, trim: true },

    // NEW session metadata
    game: { type: String, trim: true, default: "" },
    startTime: { type: Date },
    endTime: { type: Date },

    location: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },

    // CASH
    stakes: { type: String, trim: true }, 
    buyIn: { type: Number, min: 0 },
    cashOut: { type: Number, min: 0 },
    durationMinutes: { type: Number, min: 0 },

    // TOURNEY
    fee: { type: Number, min: 0 },
    rebuys: { type: Number, min: 0 },
    addons: { type: Number, min: 0 },
    winnings: { type: Number, min: 0 },
    finishPosition: { type: Number, min: 1 },
    entrants: { type: Number, min: 1 },
  },
  { timestamps: true }
);

entrySchema.index({ userId: 1, date: -1 });
entrySchema.index({ userId: 1, bankrollId: 1, date: -1 });
entrySchema.index({ userId: 1, type: 1, date: -1 });
entrySchema.index({ userId: 1, currency: 1, date: -1 });

// helpful for filtering
entrySchema.index({ userId: 1, bankrollId: 1, game: 1, date: -1 });
entrySchema.index({ userId: 1, bankrollId: 1, location: 1, date: -1 });

export const Entry = mongoose.model("Entry", entrySchema);