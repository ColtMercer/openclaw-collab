"use client";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface DayBucket {
  _id: string;
  total: number;
  count: number;
}

interface HistoricalMonth {
  _id: string;
  total: number;
}

interface Props {
  dailyThisMonth: DayBucket[];
  historicalMonthly: HistoricalMonth[];
  dailyBurnRate: number;
  daysInMonth: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#141420",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

function fmtDay(key: string) {
  const [, , d] = key.split("-");
  return `${parseInt(d)}`;
}

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function VelocityClient({
  dailyThisMonth,
  historicalMonthly,
  dailyBurnRate,
  daysInMonth,
}: Props) {
  // Build a full month array (days 1 → daysInMonth), fill missing with 0
  const dailyMap: Record<string, number> = {};
  for (const d of dailyThisMonth) dailyMap[d._id] = d.total;

  // Determine year/month from first data point or today
  const today = new Date();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const key = `${yearMonth}-${day}`;
    return {
      day: `${i + 1}`,
      Spend: +(dailyMap[key] || 0).toFixed(2),
    };
  });

  // Historical comparison bar chart data
  const histData = historicalMonthly.map((m) => ({
    month: fmtMonth(m._id),
    Total: +m.total.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      {/* Daily spend chart */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-1">Daily Spending This Month</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Each bar = one day. Red dashed line = your daily burn rate ({formatCurrency(dailyBurnRate)}/day).
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={50} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Spent"]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <ReferenceLine y={dailyBurnRate} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
            <Bar dataKey="Spend" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Historical comparison */}
      {histData.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Previous 3 Months — For Reference</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={histData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Total"]}
              />
              <Bar dataKey="Total" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
