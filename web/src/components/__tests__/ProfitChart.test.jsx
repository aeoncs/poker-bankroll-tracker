import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line-series" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

import ProfitChart from "../ProfitChart";

describe("ProfitChart", () => {
  it("renders empty state when no data is provided", () => {
    render(<ProfitChart data={[]} currency="USD" />);

    expect(screen.getByText("No chart data yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("renders empty state when data is missing", () => {
    render(<ProfitChart currency="USD" />);

    expect(screen.getByText("No chart data yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("renders chart title with currency when data exists", () => {
    const data = [
      { date: "2026-01-01", cumulative: 100 },
      { date: "2026-01-02", cumulative: 150 },
    ];

    render(<ProfitChart data={data} currency="USD" />);

    expect(screen.getByText("Cumulative Profit (USD)")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line-series")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
  });
});