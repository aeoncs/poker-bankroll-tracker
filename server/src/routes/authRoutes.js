import { Router } from "express";
import { register, login, logout, me, googleStart, googleCallback } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);

// Google OAuth
authRoutes.get("/google", googleStart);
authRoutes.get("/google/callback", googleCallback);