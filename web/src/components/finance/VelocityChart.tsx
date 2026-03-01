"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface VelocityChartProps {
  data: { _id: string; total: number }[];
}

const tooltipStyle = {
  backgroundColor: "#1a1a2e",
  border: "1px solid #27272a",
  borderRadius: 8,
};

export function VelocityChart({ data }: VelocityChartProps) {
  const mapped = data.map((d) => ({
    day: d._id.split("-")[2].replace(/^0/, ""), // "02" → "2"
    total: d.total,
    date: d._id,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={mapped} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" stroke="#71717a" fontSize={11} interval={1} />
        <YAxis
          stroke="#71717a"
          fontSize={11}
          tickFormatter={(v) => `$${(v / 1).toFixed(0)}`}
          width={60}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Spent"]}
          labelFormatter={(label) => `Day ${label}`}
        />
        <Bar dataKey="total" name="Spent" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
