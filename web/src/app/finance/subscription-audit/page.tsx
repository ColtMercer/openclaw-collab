import { Card } from "@/components/finance/Card";
import { getSubscriptionAuditReport, type SubscriptionAuditGroup } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function healthBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (score >= 60) return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30";
  return "bg-red-500/15 text-red-300 border border-red-500/30";
}

function groupLabel(groupName: SubscriptionAuditGroup["groupName"]): string {
  switch (groupName) {
    case "gym": return "Gym & Fitness";
    case "streaming": return "Streaming";
    case "ai_tools": return "AI Tools";
    case "cloud": return "Cloud & Dev Tools";
    case "adult": return "Adult";
    case "food_delivery": return "Meal Kits";
    case "clothing": return "Clothing";
    default: return "Other";
  }
}

export default async function SubscriptionAuditPage() {
  const report = await getSubscriptionAuditReport();
  const groups = [...report.groups].sort((a, b) => {
    if (a.isRedundant !== b.isRedundant) return a.isRedundant ? -1 : 1;
    return b.totalMonthly - a.totalMonthly;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subscription Audit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Spot overlap, bloat, and price creep across recurring subscriptions.
          </p>
        </div>
        <div className={`inline-flex min-w-[120px] flex-col items-center rounded-2xl px-5 py-4 ${healthBadgeClass(report.healthScore)}`}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/80">Health Score</span>
          <span className="mt-2 text-4xl font-bold leading-none">{report.healthScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Total Monthly Spend"
          value={formatCurrency(report.totalMonthlySpend)}
          subtitle={`${formatCurrency(report.totalMonthlySpend * 12)}/year`}
          className="border-indigo-500/20"
        />
        <Card
          title="Redundant Groups"
          value={`${report.redundantGroupCount}`}
          subtitle="Categories with 2+ subscriptions"
          className={report.redundantGroupCount > 0 ? "border-yellow-500/30" : ""}
        />
        <Card
          title="Price Creep Alerts"
          value={`${report.priceCreepCount}`}
          subtitle="5%+ increase vs early months"
          className={report.priceCreepCount > 0 ? "border-red-500/30" : ""}
        />
      </div>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#141420] p-6 text-sm text-zinc-400">
            No recurring subscriptions found in the last 12 months.
          </div>
        ) : groups.map((group) => (
          <section
            key={group.groupName}
            className={`rounded-xl border bg-[#141420] p-5 ${group.groupName === "adult" ? "border-fuchsia-500/30 shadow-[0_0_0_1px_rgba(217,70,239,0.1)]" : "border-[#27272a]"}`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-zinc-100">{groupLabel(group.groupName)}</h2>
                {group.isRedundant && (
                  <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-300">
                    ⚠️ Redundant
                  </span>
                )}
                {group.groupName === "adult" && (
                  <span className="inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/15 px-2.5 py-1 text-xs font-semibold text-fuchsia-300">
                    Prominent Review
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-400">{group.count} subscriptions</div>
                <div className="text-lg font-semibold text-zinc-100">{formatCurrency(group.totalMonthly)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="pb-2 font-medium">Merchant</th>
                    <th className="pb-2 font-medium text-right">Monthly</th>
                    <th className="pb-2 font-medium text-right">Variance</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.subscriptions.map((subscription) => (
                    <tr key={`${group.groupName}-${subscription.merchant}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-3 font-medium text-zinc-200">{subscription.merchant}</td>
                      <td className="py-3 text-right font-mono text-zinc-100">{formatCurrency(subscription.monthlyAmount)}</td>
                      <td className="py-3 text-right font-mono text-zinc-300">{formatCurrency(subscription.amountVariance)}</td>
                      <td className="py-3 text-right">
                        {subscription.hasPriceCreep ? (
                          <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                            Price Creep
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Stable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
