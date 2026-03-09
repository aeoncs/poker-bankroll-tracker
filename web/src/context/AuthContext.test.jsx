import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../lib/apiFetch";
import { AuthProvider, useAuth } from "./AuthContext";

function TestComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading</div>;
  return <div>{user?.email ?? "No user"}</div>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads user from /api/auth/me", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      user: { email: "test@test.com" },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/me");
  });
});