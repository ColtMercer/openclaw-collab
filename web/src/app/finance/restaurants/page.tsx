import { getRestaurantData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

function shortDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function loyaltyBadge(visits: number): { label: string; color: string } {
  if (visits >= 5) return { label: "🏆 Regular", color: "text-yellow-400" };
  if (visits >= 3) return { label: "⭐ Frequent", color: "text-indigo-400" };
  if (visits >= 2) return { label: "↩️ Returning", color: "text-blue-400" };
  return { label: "🆕 One-Time", color: "text-zinc-500" };
}

export default async function RestaurantsPage() {
  const { merchants, byMonth, recentTransactions, totalSpend, totalVisits } = await getRestaurantData(12);

  const uniqueRestaurants = merchants.length;
  const avgPerVisit = totalVisits > 0 ? totalSpend / totalVisits : 0;

  // Top 3 share of wallet
  const top3Total = merchants.slice(0, 3).reduce((s, m) => s + m.total, 0);
  const top3Pct = totalSpend > 0 ? Math.round((top3Total / totalSpend) * 100) : 0;

  const maxMonthly = Math.max(...(byMonth as { _id: string; total: number; count: number }[]).map((m) => m.total), 1);
  const maxMerchantTotal = merchants[0]?.total || 1;

  // Is this month (current) present in byMonth?
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthData = (byMonth as { _id: string; total: number; count: number }[]).find((m) => m._id === currentMonthKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🍽️ Restaurant Loyalty Map</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Where you dine, how often, and how much — last 12 months.
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Spent"
          value={formatCurrency(totalSpend)}
          subtitle="Last 12 months"
          className="border-indigo-500/20"
        />
        <Card
          title="Total Visits"
          value={`${totalVisits}`}
          subtitle={`Avg ${totalVisits > 0 ? (totalVisits / 12).toFixed(1) : 0}x/month`}
        />
        <Card
          title="Avg Per Visit"
          value={formatCurrency(avgPerVisit)}
          subtitle="Across all restaurants"
        />
        <Card
          title="Unique Restaurants"
          value={`${uniqueRestaurants}`}
          subtitle={`Top 3 = ${top3Pct}% of spend`}
          className="border-yellow-500/20"
        />
      </div>

      {/* This month spotlight */}
      {currentMonthData && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm">
          <span className="text-indigo-400 font-semibold">📅 This Month: </span>
          <span className="text-zinc-300">
            You&apos;ve spent <strong className="text-indigo-300">{formatCurrency(currentMonthData.total)}</strong> on{" "}
            <strong>{currentMonthData.count}</strong> restaurant visit{currentMonthData.count !== 1 ? "s" : ""} so far.
            {avgPerVisit > 0 && currentMonthData.total / currentMonthData.count > avgPerVisit * 1.2 && (
              <span className="text-yellow-400 ml-1">
                Your avg per visit ({formatCurrency(currentMonthData.total / currentMonthData.count)}) is higher than your 12-month avg — treating yourself!
              </span>
            )}
          </span>
        </div>
      )}

      {/* Loyalty callout */}
      {merchants.length >= 3 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm">
          <span className="text-yellow-400 font-semibold">🏆 Top 3 Restaurants: </span>
          <span className="text-zinc-300">
            {merchants.slice(0, 3).map((m) => m.name).join(", ")} account for{" "}
            <strong className="text-yellow-300">{top3Pct}%</strong> of your total restaurant spend (
            {formatCurrency(top3Total)}).
          </span>
        </div>
      )}

      {/* Monthly spend bar chart */}
      {(byMonth as { _id: string; total: number; count: number }[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly Restaurant Spend</h2>
          <div className="flex items-end gap-1.5 h-32">
            {(byMonth as { _id: string; total: number; count: number }[]).map((m, i) => {
              const height = Math.round((m.total / maxMonthly) * 100);
              const isCurrent = m._id === currentMonthKey;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] text-zinc-400 font-mono truncate">{formatCurrency(m.total)}</span>
                  <div
                    className={`w-full rounded-t ${isCurrent ? "bg-indigo-500" : "bg-indigo-800/60"}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[9px] text-zinc-500 truncate w-full text-center">{monthLabel(m._id)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top restaurants table */}
      {merchants.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Restaurant Rankings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Restaurant</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
                <th className="pb-2 font-medium text-right">Visits</th>
                <th className="pb-2 font-medium text-right">Avg/Visit</th>
                <th className="pb-2 font-medium">First Visit</th>
                <th className="pb-2 font-medium">Last Visit</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {merchants.slice(0, 30).map((m, i) => {
                const badge = loyaltyBadge(m.count);
                const shareOfWallet = totalSpend > 0 ? ((m.total / totalSpend) * 100).toFixed(1) : "0";
                const barWidth = Math.round((m.total / maxMerchantTotal) * 100);
                return (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-500 text-xs font-mono w-8">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </td>
                    <td className="py-2 font-medium text-zinc-200">
                      <div>{m.name}</div>
                      <div className="h-0.5 bg-zinc-800 rounded-full mt-1 w-full">
                        <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{shareOfWallet}% of restaurant spend</div>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(m.total)}</td>
                    <td className="py-2 text-right text-zinc-400">{m.count}×</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(m.avgAmount)}</td>
                    <td className="py-2 text-zinc-500 text-xs">{shortDate(m.firstVisit)}</td>
                    <td className="py-2 text-zinc-400 text-xs">{shortDate(m.lastVisit)}</td>
                    <td className={`py-2 text-xs font-semibold ${badge.color}`}>{badge.label}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 font-semibold">
                <td></td>
                <td className="pt-3 text-zinc-300">{uniqueRestaurants} restaurants</td>
                <td className="pt-3 text-right font-mono">{formatCurrency(totalSpend)}</td>
                <td className="pt-3 text-right">{totalVisits}×</td>
                <td className="pt-3 text-right font-mono">{formatCurrency(avgPerVisit)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Recent restaurant transactions */}
      {(recentTransactions as { transaction_id?: string; date: string; description: string; amount: number; category?: string }[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Recent Restaurant Transactions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(recentTransactions as { transaction_id?: string; date: string; description: string; amount: number }[]).map((t, i) => (
                <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-400 text-xs">{shortDate(t.date)}</td>
                  <td className="py-2 text-zinc-200 max-w-xs truncate">{t.description}</td>
                  <td className="py-2 text-right font-mono font-semibold text-red-400">
                    {formatCurrency(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {merchants.length === 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-10 text-center">
          <p className="text-zinc-500">No restaurant transactions found in the last 12 months.</p>
        </div>
      )}
    </div>
  );
}
