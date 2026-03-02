"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface SavingsRateChartProps {
  data: { _id: string; savingsRate: number }[];
}

function barColor(rate: number): string {
  if (rate >= 20) return "#10b981";
  if (rate >= 10) return "#f59e0b";
  return "#ef4444";
}

function shortLabel(monthKey: string): string {
  // "2025-02" → "Feb '25"
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const tooltipStyle = {
  backgroundColor: "#1a1a2e",
  border: "1px solid #27272a",
  borderRadius: 8,
};

export function SavingsRateChart({ data }: SavingsRateChartProps) {
  const mapped = data.map((d) => ({ ...d, label: shortLabel(d._id) }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={mapped} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
        <YAxis
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          domain={[-60, 100]}
        />
        <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />
        <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)}%`, "Savings Rate"]}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Bar dataKey="savingsRate" name="Savings Rate" radius={[4, 4, 0, 0]}>
          {mapped.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.savingsRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
