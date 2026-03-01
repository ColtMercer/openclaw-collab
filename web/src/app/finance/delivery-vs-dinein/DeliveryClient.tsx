"use client";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

interface MonthBucket {
  _id: string;
  total: number;
  count: number;
}

interface Merchant {
  _id: string;
  total: number;
  count: number;
  avg: number;
}

interface Props {
  deliveryByMonth: MonthBucket[];
  dineInByMonth: MonthBucket[];
  deliveryMerchants: Merchant[];
  dineInMerchants: Merchant[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#141420",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function DeliveryClient({ deliveryByMonth, dineInByMonth, deliveryMerchants, dineInMerchants }: Props) {
  // Merge months for chart
  const allMonths = Array.from(new Set([...deliveryByMonth.map((d) => d._id), ...dineInByMonth.map((d) => d._id)])).sort();
  const delivMap: Record<string, MonthBucket> = {};
  for (const d of deliveryByMonth) delivMap[d._id] = d;
  const dineMap: Record<string, MonthBucket> = {};
  for (const d of dineInByMonth) dineMap[d._id] = d;

  const chartData = allMonths.map((m) => ({
    month: fmtMonth(m),
    Delivery: +(delivMap[m]?.total || 0).toFixed(2),
    "Dine-In": +(dineMap[m]?.total || 0).toFixed(2),
    delivOrders: delivMap[m]?.count || 0,
    dineOrders: dineMap[m]?.count || 0,
  }));

  const totalDelivery = deliveryByMonth.reduce((s, d) => s + d.total, 0);
  const totalDineIn = dineInByMonth.reduce((s, d) => s + d.total, 0);
  const totalDelivOrders = deliveryByMonth.reduce((s, d) => s + d.count, 0);
  const totalDineOrders = dineInByMonth.reduce((s, d) => s + d.count, 0);
  const avgDelivOrder = totalDelivOrders > 0 ? totalDelivery / totalDelivOrders : 0;
  const avgDineOrder = totalDineOrders > 0 ? totalDineIn / totalDineOrders : 0;
  const deliveryPremium = avgDineOrder > 0 ? ((avgDelivOrder - avgDineOrder) / avgDineOrder) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🚗 Delivery vs. Dine-In</h1>
      <p className="text-zinc-400 text-sm">Comparing what you spend on food delivery apps vs. actually going to restaurants (last 6 months).</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Delivery</div>
          <div className="text-xl font-bold text-orange-400">{formatCurrency(totalDelivery)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Dine-In</div>
          <div className="text-xl font-bold text-emerald-400">{formatCurrency(totalDineIn)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Delivery Orders</div>
          <div className="text-xl font-bold text-orange-400">{totalDelivOrders}</div>
          <div className="text-xs text-zinc-500">avg {formatCurrency(avgDelivOrder)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Dine-In Visits</div>
          <div className="text-xl font-bold text-emerald-400">{totalDineOrders}</div>
          <div className="text-xs text-zinc-500">avg {formatCurrency(avgDineOrder)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Delivery Premium</div>
          <div className={`text-xl font-bold ${deliveryPremium > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {deliveryPremium > 0 ? "+" : ""}{deliveryPremium.toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-500">vs avg dine-in order</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Delivery Share</div>
          <div className="text-xl font-bold text-amber-400">
            {totalDelivery + totalDineIn > 0
              ? ((totalDelivery / (totalDelivery + totalDineIn)) * 100).toFixed(0)
              : 0}%
          </div>
          <div className="text-xs text-zinc-500">of food spend</div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(val, name) => [formatCurrency(val as number), name as string]}
            />
            <Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 13 }} />
            <Bar dataKey="Delivery" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Dine-In" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Merchant Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Apps */}
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 text-orange-400">🚗 Delivery Apps</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Orders</th>
                <th className="pb-2 font-medium text-right">Avg</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {deliveryMerchants.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-zinc-500">No delivery transactions found</td></tr>
              ) : deliveryMerchants.map((m, i) => (
                <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-2 text-zinc-300 max-w-[160px] truncate">{m._id}</td>
                  <td className="py-2 text-right text-zinc-400">{m.count}</td>
                  <td className="py-2 text-right text-zinc-400">{formatCurrency(m.avg)}</td>
                  <td className="py-2 text-right font-semibold text-orange-400">{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dine-In Restaurants */}
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400">🍽️ Top Restaurants (Dine-In)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Visits</th>
                <th className="pb-2 font-medium text-right">Avg</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {dineInMerchants.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-zinc-500">No dine-in transactions found</td></tr>
              ) : dineInMerchants.map((m, i) => (
                <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-2 text-zinc-300 max-w-[160px] truncate">{m._id}</td>
                  <td className="py-2 text-right text-zinc-400">{m.count}</td>
                  <td className="py-2 text-right text-zinc-400">{formatCurrency(m.avg)}</td>
                  <td className="py-2 text-right font-semibold text-emerald-400">{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight callout */}
      {totalDelivery > 0 && deliveryPremium > 20 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-sm">
          <span className="font-semibold text-orange-400">💡 Insight: </span>
          <span className="text-zinc-300">
            You&apos;re paying {deliveryPremium.toFixed(0)}% more per order via delivery apps compared to dining in. 
            Over the last 6 months that delivery premium cost you roughly{" "}
            <strong>{formatCurrency(Math.max(0, totalDelivery - (avgDineOrder * totalDelivOrders)))}</strong> extra.
          </span>
        </div>
      )}
    </div>
  );
}
