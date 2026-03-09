import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "a",
      {
        href: typeof href === "string" ? href : "#",
        ...props,
      },
      children
    ),
}));