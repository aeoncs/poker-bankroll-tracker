import bcrypt from "bcrypt";
import crypto from "crypto";
import fetch from "node-fetch";
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

function setOauthStateCookie(res, state) {
  res.cookie("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
}

function clearOauthStateCookie(res) {
  res.clearCookie("oauth_state", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function randomState() {
  return crypto.randomBytes(24).toString("base64url");
}

function googleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URL,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "online",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URL,
    grant_type: "authorization_code",
  });

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const err = new Error("Google token exchange failed");
    err.details = text;
    err.status = 400;
    throw err;
  }

  return r.json();
}

async function fetchGoogleProfile(accessToken) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const err = new Error("Google userinfo failed");
    err.details = text;
    err.status = 400;
    throw err;
  }

  return r.json();
}

// ---------------- Existing auth ----------------

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

    res.status(201).json({ ok: true });
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

    // If this is a Google-only user, they must use Google login
    if (!user.passwordHash) {
      return res.status(401).json({ message: "Please sign in with Google for this account" });
    }

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
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// ---------------- Google OAuth ----------------

export async function googleStart(req, res) {
  const state = randomState();
  setOauthStateCookie(res, state);
  res.redirect(googleAuthUrl(state));
}

export async function googleCallback(req, res, next) {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    const expectedState = req.cookies.oauth_state;
    clearOauthStateCookie(res);

    if (!code) return res.status(400).json({ message: "Missing code" });
    if (!state || !expectedState || state !== expectedState) {
      return res.status(400).json({ message: "Invalid OAuth state" });
    }

    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);

    const email = String(profile.email || "").toLowerCase().trim();
    const googleId = String(profile.sub || "").trim();

    if (!email || !googleId) return res.status(400).json({ message: "Google profile missing email/id" });


    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        email,
        googleId,
        name: profile.name || "",
        avatarUrl: profile.picture || "",
        passwordHash: "",

        bankrolls: [],
        onboardingCompleted: false,
        theme: "dark",
        games: [],
        stakes: [],
        locations: [],
        defaultBankrollId: null,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.name && profile.name) user.name = profile.name;
      if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
      await user.save();
    }

    const token = signAuthToken(user._id.toString());
    setAuthCookie(res, token);


    res.redirect(`${process.env.CLIENT_ORIGIN}/dashboard`);
  } catch (err) {
    next(err);
  }
}