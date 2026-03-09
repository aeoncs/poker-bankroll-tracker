import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("../../lib/authApi", () => ({
  logout: vi.fn(),
}));

vi.mock("../../lib/usersApi", () => ({
  updateSettings: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { logout } from "../../lib/authApi";
import { updateSettings } from "../../lib/usersApi";
import { useAuth } from "../../context/AuthContext";
import AppNav from "../AppNav";

describe("AppNav", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(updateSettings).mockReset();
    vi.mocked(useAuth).mockReset();
    vi.restoreAllMocks();
  });

  it("renders navigation links and user email", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com", theme: "dark" },
      refreshMe: vi.fn(),
      setUser: vi.fn(),
    });

    render(<AppNav />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /light mode/i })).toBeInTheDocument();
  });

  it("logs out, refreshes auth state, and redirects to /login", async () => {
    const refreshMeMock = vi.fn().mockResolvedValue({});
    const setUserMock = vi.fn();

    vi.mocked(logout).mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com", theme: "dark" },
      refreshMe: refreshMeMock,
      setUser: setUserMock,
    });

    render(<AppNav />);

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(refreshMeMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("toggles from light to dark and persists settings", async () => {
    const refreshMeMock = vi.fn().mockResolvedValue({});
    const setUserMock = vi.fn();

    vi.mocked(updateSettings).mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com", theme: "light" },
      refreshMe: refreshMeMock,
      setUser: setUserMock,
    });

    render(<AppNav />);

    await userEvent.click(screen.getByRole("button", { name: /dark mode/i }));

    expect(setUserMock).toHaveBeenCalledTimes(1);

    const optimisticUpdater = setUserMock.mock.calls[0][0];
    expect(
      optimisticUpdater({ email: "test@test.com", theme: "light" })
    ).toEqual({ email: "test@test.com", theme: "dark" });

    expect(updateSettings).toHaveBeenCalledWith({ theme: "dark" });
    expect(refreshMeMock).toHaveBeenCalledTimes(1);
  });

  it("toggles from dark to light and persists settings", async () => {
    const refreshMeMock = vi.fn().mockResolvedValue({});
    const setUserMock = vi.fn();

    vi.mocked(updateSettings).mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com", theme: "dark" },
      refreshMe: refreshMeMock,
      setUser: setUserMock,
    });

    render(<AppNav />);

    await userEvent.click(screen.getByRole("button", { name: /light mode/i }));

    expect(setUserMock).toHaveBeenCalledTimes(1);

    const optimisticUpdater = setUserMock.mock.calls[0][0];
    expect(
      optimisticUpdater({ email: "test@test.com", theme: "dark" })
    ).toEqual({ email: "test@test.com", theme: "light" });

    expect(updateSettings).toHaveBeenCalledWith({ theme: "light" });
    expect(refreshMeMock).toHaveBeenCalledTimes(1);
  });

  it("rolls back optimistic theme update if settings save fails", async () => {
    const refreshMeMock = vi.fn();
    const setUserMock = vi.fn();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    vi.mocked(updateSettings).mockRejectedValue(new Error("Failed to update theme"));
    vi.mocked(useAuth).mockReturnValue({
      user: { email: "test@test.com", theme: "light" },
      refreshMe: refreshMeMock,
      setUser: setUserMock,
    });

    render(<AppNav />);

    await userEvent.click(screen.getByRole("button", { name: /dark mode/i }));

    expect(setUserMock).toHaveBeenCalledTimes(2);

    const optimisticUpdater = setUserMock.mock.calls[0][0];
    const rollbackUpdater = setUserMock.mock.calls[1][0];

    expect(
      optimisticUpdater({ email: "test@test.com", theme: "light" })
    ).toEqual({ email: "test@test.com", theme: "dark" });

    expect(
      rollbackUpdater({ email: "test@test.com", theme: "dark" })
    ).toEqual({ email: "test@test.com", theme: "light" });

    expect(alertSpy).toHaveBeenCalledWith("Failed to update theme");
  });

  it("does nothing on theme toggle when user is missing", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      refreshMe: vi.fn(),
      setUser: vi.fn(),
    });

    render(<AppNav />);

    await userEvent.click(screen.getByRole("button", { name: /light mode/i }));

    expect(updateSettings).not.toHaveBeenCalled();
  });
});