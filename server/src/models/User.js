import mongoose from "mongoose";

const bankrollSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    startingBankroll: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    bankrolls: { type: [bankrollSchema], default: [] },
    

    // preferences
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    games: { type: [String], default: [] },
    stakes: { type: [String], default: [] },
    locations: { type: [String], default: [] },

    // default settings for new sessions

    defaultGame: { type: String, default: "" },
    defaultStake: { type: String, default: "" },
    defaultLocation: { type: String, default: "" },
    defaultBankrollId: { type: mongoose.Schema.Types.ObjectId, default: null },

    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);