"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

type MonthlyTotal = {
  month: string;
  total: number;
};

type Props = {
  monthlyTotals: MonthlyTotal[];
};

const TOOLTIP_STYLE = {
  backgroundColor: "#141420",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-");
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function TradingInfraClient({ monthlyTotals }: Props) {
  const chartData = monthlyTotals.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));

  return (
    <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-1">Monthly Trading Infra Spend</h2>
      <p className="text-zinc-500 text-xs mb-4">
        Rolling 12-month view of data feeds, broker tooling, and platform subscriptions.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tradingInfraFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Spend"]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#60a5fa"
            strokeWidth={2}
            fill="url(#tradingInfraFill)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
