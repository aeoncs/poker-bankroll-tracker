import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ user: null })),
  http.post("/api/auth/login", () => HttpResponse.json({ ok: true })),
  http.post("/api/users/setup", () => HttpResponse.json({ ok: true }))
);