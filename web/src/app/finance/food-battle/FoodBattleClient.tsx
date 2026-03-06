"use client";

import { Card } from "@/components/finance/Card";
import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface FoodBattleMonth {
  month: string;
  delivery: number;
  grocery: number;
  deliveryCount: number;
  groceryCount: number;
  deliveryPct: number;
}

interface Props {
  data: FoodBattleMonth[];
  allTimeTotals: {
    delivery: number;
    grocery: number;
  };
  currentMonthRatio: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#141420",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function statusForPct(pct: number) {
  if (pct > 50) return { icon: "🔴", label: "High" };
  if (pct >= 35) return { icon: "🟡", label: "Watch" };
  return { icon: "🟢", label: "Healthy" };
}

export default function FoodBattleClient({ data, allTimeTotals, currentMonthRatio }: Props) {
  const currentMonth = data[data.length - 1];
  const trendData = data.map((item) => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  const allTimeDeliveryPct = allTimeTotals.delivery + allTimeTotals.grocery > 0
    ? (allTimeTotals.delivery / (allTimeTotals.delivery + allTimeTotals.grocery)) * 100
    : 0;

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="text-2xl font-bold">🍔 Food Battle: Delivery vs Groceries</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track how much goes to delivery apps versus actual grocery runs over the last 6 months.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Current Month Delivery"
          value={formatCurrency(currentMonth?.delivery || 0)}
          subtitle={`${currentMonth?.deliveryCount || 0} delivery orders`}
          className="text-orange-300"
        />
        <Card
          title="Current Month Groceries"
          value={formatCurrency(currentMonth?.grocery || 0)}
          subtitle={`${currentMonth?.groceryCount || 0} grocery transactions`}
          className="text-emerald-300"
        />
        <Card
          title="Delivery-to-Grocery Ratio"
          value={`${currentMonthRatio.toFixed(1)}%`}
          subtitle="Delivery share of current month food spend"
          className={currentMonthRatio > 50 ? "text-red-300" : currentMonthRatio >= 35 ? "text-amber-300" : "text-green-300"}
        />
      </div>

      {currentMonthRatio > 50 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span className="font-semibold">Warning:</span> Delivery is eating your grocery budget!
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
          <h2 className="mb-4 text-lg font-semibold">Monthly Delivery vs Grocery Spend</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="monthLabel" stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="delivery" name="Delivery" fill="#fb923c" radius={[6, 6, 0, 0]} />
              <Bar dataKey="grocery" name="Groceries" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
          <h2 className="mb-4 text-lg font-semibold">All-Time Totals</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-[#27272a] bg-[#0a0a12] p-4">
              <p className="text-sm text-zinc-400">Delivery Total</p>
              <p className="mt-1 text-2xl font-bold text-orange-300">{formatCurrency(allTimeTotals.delivery)}</p>
            </div>
            <div className="rounded-lg border border-[#27272a] bg-[#0a0a12] p-4">
              <p className="text-sm text-zinc-400">Grocery Total</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{formatCurrency(allTimeTotals.grocery)}</p>
            </div>
            <div className="rounded-lg border border-[#27272a] bg-[#0a0a12] p-4">
              <p className="text-sm text-zinc-400">Delivery Share</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{allTimeDeliveryPct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <h2 className="mb-4 text-lg font-semibold">Delivery % Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="deliveryTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="monthLabel" stroke="#a1a1aa" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="#a1a1aa" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => `${Number(value || 0).toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="deliveryPct" name="Delivery %" stroke="#f97316" fill="url(#deliveryTrend)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <h2 className="mb-4 text-lg font-semibold">Monthly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#27272a] text-sm">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="px-3 py-2 font-medium">Month</th>
                <th className="px-3 py-2 font-medium">Delivery $</th>
                <th className="px-3 py-2 font-medium">Grocery $</th>
                <th className="px-3 py-2 font-medium">Delivery %</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {trendData.map((item) => {
                const status = statusForPct(item.deliveryPct);
                return (
                  <tr key={item.month} className="text-zinc-200">
                    <td className="px-3 py-2">{item.monthLabel}</td>
                    <td className="px-3 py-2 text-orange-300">{formatCurrency(item.delivery)}</td>
                    <td className="px-3 py-2 text-emerald-300">{formatCurrency(item.grocery)}</td>
                    <td className="px-3 py-2">{item.deliveryPct.toFixed(1)}%</td>
                    <td className="px-3 py-2">{status.icon} {status.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
