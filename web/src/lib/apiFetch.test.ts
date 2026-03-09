import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "./apiFetch";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns JSON data on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => "application/json",
        },
        json: vi.fn().mockResolvedValue({ hello: "world" }),
      })
    );

    const result = await apiFetch("/api/test");
    expect(result).toEqual({ hello: "world" });
  });

  it("returns { user: null } for 401 on /api/auth/me", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: {
          get: () => "application/json",
        },
        json: vi.fn().mockResolvedValue({}),
      })
    );

    const result = await apiFetch("/api/auth/me");
    expect(result).toEqual({ user: null });
  });

  it("throws error on failed request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: {
          get: () => "application/json",
        },
        json: vi.fn().mockResolvedValue({ message: "Bad request" }),
      })
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Bad request");
  });
});