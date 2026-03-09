import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../context/AuthContext";
import ThemeShell from "../ThemeShell";

describe("ThemeShell", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });

  it("uses dark theme by default when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    });

    const { container } = render(
      <ThemeShell>
        <div>Content</div>
      </ThemeShell>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("shellDark");
    expect(container.firstChild).not.toHaveClass("shellLight");
  });

  it("uses dark theme when user theme is dark", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { theme: "dark" },
    });

    const { container } = render(
      <ThemeShell>
        <div>Content</div>
      </ThemeShell>
    );

    expect(container.firstChild).toHaveClass("shellDark");
    expect(container.firstChild).not.toHaveClass("shellLight");
  });

  it("uses light theme when user theme is light", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { theme: "light" },
    });

    const { container } = render(
      <ThemeShell>
        <div>Content</div>
      </ThemeShell>
    );

    expect(container.firstChild).toHaveClass("shellLight");
    expect(container.firstChild).not.toHaveClass("shellDark");
  });
});