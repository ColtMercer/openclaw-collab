"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

const tooltipStyle = { backgroundColor: "#1a1a2e", border: "1px solid #27272a", borderRadius: 8 };

type RentHistoryPoint = {
  month: string;
  amount: number;
};

export function RentTrackerChart({ data }: { data: RentHistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickFormatter={(value) => String(value).slice(2)} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value || 0))} />
        <ReferenceLine y={2400} stroke="#f59e0b" strokeDasharray="4 4" />
        <ReferenceLine y={2500} stroke="#6366f1" strokeDasharray="4 4" />
        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="amount" stroke="#a5b4fc" strokeWidth={2} dot={{ r: 3, fill: "#a5b4fc" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
