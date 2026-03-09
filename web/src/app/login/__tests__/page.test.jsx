import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() })
}));

jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ refreshMe: jest.fn() })
}));

test("submits login form", async () => {
  render(<LoginPage />);
  await userEvent.type(screen.getByPlaceholderText(/you@example.com/i), "a@b.com");
  await userEvent.type(screen.getByPlaceholderText(/your password/i), "pass123");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
  // If it doesn't throw, MSW handled /api/auth/login successfully
});