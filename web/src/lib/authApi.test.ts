import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiFetch";
import { login, register, logout } from "./authApi";

describe("authApi", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("calls login endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });

    await login("test@test.com", "123");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com", password: "123" }),
      })
    );
  });

  it("calls register endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });

    await register("a@b.com", "pw");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", password: "pw" }),
      })
    );
  });

  it("calls logout endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });

    await logout();

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    });
  });
});