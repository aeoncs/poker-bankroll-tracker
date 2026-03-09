import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";
import LoginPage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    setUser: vi.fn(),
    refreshMe: vi.fn(),
  }),
}));

test("submits login form", async () => {
  render(<LoginPage />);

  await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), "a@b.com");
  await userEvent.type(screen.getByPlaceholderText(/your password/i), "pass123");

  expect(screen.getByPlaceholderText(/you@example.com/i)).toHaveValue("a@b.com");
  expect(screen.getByPlaceholderText(/your password/i)).toHaveValue("pass123");
});