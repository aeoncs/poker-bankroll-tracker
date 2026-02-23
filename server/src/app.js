import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRoutes } from "./routes/authRoutes.js";
import { entryRoutes } from "./routes/entryRoutes.js";
import { statsRoutes } from "./routes/statsRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);

  // Same routes, two names
  app.use("/api/entries", entryRoutes);
  app.use("/api/sessions", entryRoutes);

  app.use("/api/stats", statsRoutes);
  app.use("/api/users", userRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // error handler
  app.use((err, req, res, next) => {
    console.error(err);

    if (err?.name === "CastError") {
      return res.status(400).json({ message: "Invalid id format" });
    }

    res.status(err.status || 500).json({ message: err.message || "Server error" });
  });

  return app;
}