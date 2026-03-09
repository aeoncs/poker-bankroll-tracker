import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import RequireAuth from "../RequireAuth";
import { useAuth } from "../../context/AuthContext";

describe("RequireAuth", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.mocked(useAuth).mockReset();
  });

  it("shows loading state while auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <RequireAuth>
        <div>Secret Content</div>
      </RequireAuth>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects logged-out users to /login", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <RequireAuth>
        <div>Secret Content</div>
      </RequireAuth>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });

    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("redirects non-onboarded users to /setup", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "test@test.com",
        onboardingCompleted: false,
      },
      loading: false,
    });

    render(
      <RequireAuth>
        <div>Secret Content</div>
      </RequireAuth>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/setup");
    });

    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("renders children for onboarded users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "test@test.com",
        onboardingCompleted: true,
      },
      loading: false,
    });

    render(
      <RequireAuth>
        <div>Secret Content</div>
      </RequireAuth>
    );

    expect(screen.getByText("Secret Content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders children when requireOnboarding is false", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        email: "test@test.com",
        onboardingCompleted: false,
      },
      loading: false,
    });

    render(
      <RequireAuth requireOnboarding={false}>
        <div>Secret Content</div>
      </RequireAuth>
    );

    expect(screen.getByText("Secret Content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});