"use client";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
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
  lastSeen: string;
}

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
}

interface Props {
  byMonth: MonthBucket[];
  byMerchant: Merchant[];
  recentTransactions: Transaction[];
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

export default function ConvenienceClient({ byMonth, byMerchant, recentTransactions }: Props) {
  const totalSpend = byMerchant.reduce((s, m) => s + m.total, 0);
  const totalVisits = byMerchant.reduce((s, m) => s + m.count, 0);
  const avgPerVisit = totalVisits > 0 ? totalSpend / totalVisits : 0;
  const monthsWithData = byMonth.length;
  const avgPerMonth = monthsWithData > 0 ? totalSpend / monthsWithData : 0;
  const avgVisitsPerMonth = monthsWithData > 0 ? totalVisits / monthsWithData : 0;

  const chartData = byMonth.map((b) => ({
    month: fmtMonth(b._id),
    Spend: +b.total.toFixed(2),
    Visits: b.count,
  }));

  // Most recent month for spotlight
  const latestMonth = byMonth[byMonth.length - 1];

  // Day of week from recent transactions
  const dowCount: Record<string, { spend: number; count: number }> = {};
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const t of recentTransactions) {
    const dow = DAYS[new Date(t.date).getDay()];
    if (!dowCount[dow]) dowCount[dow] = { spend: 0, count: 0 };
    dowCount[dow].spend += Math.abs(t.amount);
    dowCount[dow].count += 1;
  }
  const dowData = DAYS.map((d) => ({
    day: d,
    Visits: dowCount[d]?.count || 0,
    Spend: +(dowCount[d]?.spend || 0).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏪 Convenience Store Creep</h1>
        <p className="text-zinc-400 text-sm mt-1">Tracking 7-Eleven, QuikTrip, Chevron, Shell, and other quick-stop spending habits.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Spend (6mo)</div>
          <div className="text-xl font-bold text-amber-400">{formatCurrency(totalSpend)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Visits</div>
          <div className="text-xl font-bold text-amber-400">{totalVisits}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Avg Per Visit</div>
          <div className="text-xl font-bold text-zinc-300">{formatCurrency(avgPerVisit)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Avg / Month</div>
          <div className="text-xl font-bold text-zinc-300">{formatCurrency(avgPerMonth)}</div>
          <div className="text-xs text-zinc-500">{avgVisitsPerMonth.toFixed(1)} visits</div>
        </div>
        {latestMonth && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="text-xs text-amber-400 mb-1">This Month</div>
            <div className="text-xl font-bold text-amber-300">{formatCurrency(latestMonth.total)}</div>
            <div className="text-xs text-zinc-400">{latestMonth.count} visits</div>
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Monthly Spend Trend</h2>
        {chartData.length === 0 ? (
          <p className="text-zinc-500 text-sm">No convenience store transactions found in the last 6 months.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(val) => [formatCurrency(val as number), "Spend"]}
              />
              <Line type="monotone" dataKey="Spend" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Day of Week Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">By Day of Week (recent)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [val, "Visits"]} />
              <Bar dataKey="Visits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Merchants */}
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Top Merchants</h2>
          {byMerchant.length === 0 ? (
            <p className="text-zinc-500 text-sm">No convenience store transactions found.</p>
          ) : (
            <div className="space-y-2">
              {byMerchant.slice(0, 8).map((m, i) => {
                const share = totalSpend > 0 ? (m.total / totalSpend) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300 truncate max-w-[200px]">{m._id}</span>
                      <div className="text-right ml-4 shrink-0">
                        <span className="font-semibold text-amber-400">{formatCurrency(m.total)}</span>
                        <span className="text-zinc-500 ml-2">{m.count}× avg {formatCurrency(m.avg)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Recent Visits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.slice(0, 20).map((t, i) => (
                <tr key={i} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-2 text-zinc-400 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="py-2 text-zinc-300">{t.description}</td>
                  <td className="py-2 text-right font-semibold text-amber-400">{formatCurrency(Math.abs(t.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Habit callout */}
      {avgVisitsPerMonth >= 10 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
          <span className="font-semibold text-amber-400">⚠️ Habit Alert: </span>
          <span className="text-zinc-300">
            You're averaging <strong>{avgVisitsPerMonth.toFixed(1)} convenience store visits per month</strong> — 
            that's roughly {(avgVisitsPerMonth / 4.3).toFixed(1)} per week. 
            At {formatCurrency(avgPerVisit)} per stop, convenience is costing you {formatCurrency(avgPerMonth * 12)}/year.
          </span>
        </div>
      )}
    </div>
  );
}
