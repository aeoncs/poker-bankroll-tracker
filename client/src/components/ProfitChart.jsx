import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatDateLabel(value) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatTooltipLabel(value) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ProfitChart({ data, currency }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>No chart data yet.</div>;
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Cumulative Profit ({currency})</div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} />
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