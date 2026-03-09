"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ui from "../styles/ui.module.css";

function getYearSet(data) {
  const years = new Set();
  for (const p of data || []) {
    const d = new Date(p?.date);
    const y = d.getUTCFullYear();
    if (Number.isFinite(y)) years.add(y);
  }
  return years;
}

function formatTick(value, showYear) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(showYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function formatTooltipLabel(value) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ProfitChart({ data, currency }) {
  if (!data || data.length === 0) {
    return (
      <div className={ui.panel}>
        <div className={ui.subtle}>No chart data yet.</div>
      </div>
    );
  }

  const years = getYearSet(data);
  const showYear = years.size > 1;

  return (
    <div className={ui.panel}>
      <div className={ui.subtle} style={{ marginTop: 0 }}>
        Cumulative Profit ({currency})
      </div>

      <div style={{ width: "100%", height: 280, marginTop: 10 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => formatTick(v, showYear)} />
            <YAxis />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value) => [`${Number(value).toFixed(2)} ${currency}`, "Cumulative"]}
            />
            <Line type="monotone" dataKey="cumulative" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}