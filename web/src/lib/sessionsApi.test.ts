import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiFetch";
import { listSessions } from "./sessionsApi";

describe("sessionsApi", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("builds query string correctly", async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);

    await listSessions({ bankrollId: "123", limit: 10 });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/sessions?bankrollId=123&limit=10"
    );
  });
});