import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { signAuthToken } from "../utils/jwt.js";
import { registerSchema, loginSchema } from "../validation/authSchemas.js";

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}


export async function register(req, res, next) {
  try {
  
const parsed = registerSchema.parse(req.body);

const existing = await User.findOne({ email: parsed.email });
if (existing) return res.status(409).json({ message: "Email already in use" });

const passwordHash = await bcrypt.hash(parsed.password, 12);

const user = await User.create({
  email: parsed.email,
  passwordHash,
  bankrolls: [],
  onboardingCompleted: false,
  theme: "dark",
  games: [],
  stakes: [],
  locations: [],
  defaultBankrollId: null, 
});

    const token = signAuthToken(user._id.toString());
    setAuthCookie(res, token);

    res.status(201).json({ ok:true });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", details: err.errors });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.parse(req.body);

    const user = await User.findOne({ email: parsed.email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signAuthToken(user._id.toString());
    setAuthCookie(res, token);

    res.json({ ok: true });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", details: err.errors });
    }
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.json({ ok: true });
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash") ;
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}