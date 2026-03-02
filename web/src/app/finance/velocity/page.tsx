import { getSpendingVelocity } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import VelocityClient from "./VelocityClient";

export const dynamic = "force-dynamic";

function paceLabel(projectedMonthEnd: number, avgHistorical: number): {
  label: string;
  icon: string;
  color: string;
  borderColor: string;
} {
  if (avgHistorical === 0) return { label: "No history yet", icon: "📊", color: "text-zinc-400", borderColor: "border-zinc-700" };
  const ratio = projectedMonthEnd / avgHistorical;
  if (ratio >= 1.2) return { label: "Burning Hot 🔥", icon: "🔥", color: "text-red-400", borderColor: "border-red-500/40" };
  if (ratio >= 1.05) return { label: "Slightly Ahead", icon: "⚠️", color: "text-yellow-400", borderColor: "border-yellow-500/40" };
  if (ratio <= 0.85) return { label: "Under Budget", icon: "✅", color: "text-emerald-400", borderColor: "border-emerald-500/40" };
  return { label: "On Pace", icon: "🟢", color: "text-indigo-400", borderColor: "border-indigo-500/40" };
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function SpendingVelocityPage() {
  const data = await getSpendingVelocity();

  const {
    daysInMonth,
    daysElapsed,
    daysLeft,
    spentSoFar,
    dailyBurnRate,
    projectedMonthEnd,
    avgHistorical,
    dailyThisMonth,
    categoryBreakdown,
    historicalMonthly,
  } = data;

  const pctMonthElapsed = Math.round((daysElapsed / daysInMonth) * 100);
  const pctBudgetBurned = avgHistorical > 0 ? Math.min(Math.round((spentSoFar / avgHistorical) * 100), 200) : 0;

  const pace = paceLabel(projectedMonthEnd, avgHistorical);
  const overBudgetAmt = projectedMonthEnd - avgHistorical;
  const isBurningHot = avgHistorical > 0 && projectedMonthEnd > avgHistorical * 1.2;

  // Serialized for client component
  const serializedDaily = JSON.parse(JSON.stringify(dailyThisMonth));
  const serializedHistorical = JSON.parse(JSON.stringify(historicalMonthly));

  const maxCategory = (categoryBreakdown as { _id: string; total: number; count: number }[])[0]?.total || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🔥 Spending Velocity</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Daily burn rate, projected month-end, and pace vs. your historical average.
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Spent So Far"
          value={formatCurrency(spentSoFar)}
          subtitle={`Day ${daysElapsed} of ${daysInMonth}`}
          className="border-indigo-500/30"
        />
        <Card
          title="Daily Burn Rate"
          value={formatCurrency(dailyBurnRate)}
          subtitle="Per day this month"
          className={dailyBurnRate > (avgHistorical / daysInMonth) * 1.2 ? "border-red-500/30" : "border-zinc-700"}
        />
        <Card
          title="Projected Month-End"
          value={formatCurrency(projectedMonthEnd)}
          subtitle={avgHistorical > 0 ? `Avg: ${formatCurrency(avgHistorical)}` : "No history yet"}
          className={isBurningHot ? "border-red-500/30" : "border-zinc-700"}
        />
        <Card
          title="Days Left"
          value={`${daysLeft}`}
          subtitle={`${pctMonthElapsed}% of month elapsed`}
          className="border-zinc-700"
        />
      </div>

      {/* Pace indicator */}
      <div className={`bg-[#141420] border ${pace.borderColor} rounded-xl p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{pace.icon}</span>
          <div>
            <p className="text-lg font-semibold">
              Pace: <span className={pace.color}>{pace.label}</span>
            </p>
            {avgHistorical > 0 && (
              <p className="text-zinc-400 text-sm">
                Projected {formatCurrency(projectedMonthEnd)} vs. {formatCurrency(avgHistorical)} historical avg
                {isBurningHot && (
                  <span className="text-red-400 ml-2 font-semibold">
                    (+{formatCurrency(overBudgetAmt)} over)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Month Elapsed</span>
              <span>{pctMonthElapsed}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full">
              <div
                className="h-full bg-indigo-500/70 rounded-full transition-all"
                style={{ width: `${Math.min(pctMonthElapsed, 100)}%` }}
              />
            </div>
          </div>
          {avgHistorical > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Budget Burned (vs. historical avg)</span>
                <span className={pctBudgetBurned > pctMonthElapsed + 10 ? "text-red-400" : "text-emerald-400"}>
                  {pctBudgetBurned}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctBudgetBurned > 100 ? "bg-red-500" :
                    pctBudgetBurned > pctMonthElapsed + 10 ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(pctBudgetBurned, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                If % budget burned &gt; % month elapsed, you&apos;re ahead of pace.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Burning hot callout */}
      {isBurningHot && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
          <span className="text-red-400 font-semibold">🔥 Hot Alert: </span>
          <span className="text-zinc-300">
            At your current pace, you&apos;re on track to spend{" "}
            <strong className="text-red-300">{formatCurrency(projectedMonthEnd)}</strong> this month —{" "}
            <strong className="text-red-300">{formatCurrency(overBudgetAmt)}</strong> more than your historical average of{" "}
            {formatCurrency(avgHistorical)}. Slow down or you&apos;ll exceed last month&apos;s spending.
          </span>
        </div>
      )}

      {/* Charts (client component) */}
      <VelocityClient
        dailyThisMonth={serializedDaily}
        historicalMonthly={serializedHistorical}
        dailyBurnRate={dailyBurnRate}
        daysInMonth={daysInMonth}
      />

      {/* Category breakdown */}
      {(categoryBreakdown as { _id: string; total: number; count: number }[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Where It&apos;s Going — Top Categories This Month</h2>
          <div className="space-y-3">
            {(categoryBreakdown as { _id: string; total: number; count: number }[]).map((cat, i) => {
              const pct = Math.round((cat.total / maxCategory) * 100);
              const pctOfMonth = spentSoFar > 0 ? ((cat.total / spentSoFar) * 100).toFixed(0) : "0";
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-200 font-medium truncate max-w-[60%]">{cat._id}</span>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-zinc-500 text-xs">{pctOfMonth}%</span>
                      <span className="font-mono text-zinc-100 w-24 text-right">{formatCurrency(cat.total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical table */}
      {historicalMonthly.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Historical Monthly Spend</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
                <th className="pb-2 font-medium text-right">vs. Avg</th>
              </tr>
            </thead>
            <tbody>
              {[...(historicalMonthly as { _id: string; total: number }[])].reverse().map((m, i) => {
                const diff = m.total - avgHistorical;
                const diffPct = avgHistorical > 0 ? ((diff / avgHistorical) * 100).toFixed(0) : "0";
                return (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-2 font-medium text-zinc-300">{monthLabel(m._id)}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(m.total)}</td>
                    <td className={`py-2 text-right font-semibold ${diff > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {diff > 0 ? "+" : ""}{diffPct}%
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-zinc-700 font-semibold">
                <td className="pt-3 text-zinc-400">3-Month Avg</td>
                <td className="pt-3 text-right font-mono">{formatCurrency(avgHistorical)}</td>
                <td className="pt-3 text-right text-zinc-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
