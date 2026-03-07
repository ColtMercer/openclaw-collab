import { Card } from "@/components/finance/Card";
import { getInsuranceEventData } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function guessType(description: string) {
  const normalized = description.toLowerCase();
  if (normalized.includes("national claims") || normalized.includes("claim")) return "Possible Claim Payment";
  if (normalized.includes("premium") || normalized.includes("policy")) return "Premium Payment";
  if (normalized.includes("renewal")) return "Annual Renewal";
  return "Review Needed";
}

export default async function InsuranceEventsPage() {
  const data = await getInsuranceEventData();

  const totalPaid = data.monthlyTotals.reduce((sum, item) => sum + item.total, 0);
  const activeMerchants = data.topMerchants.length;
  const maxMonthly = Math.max(...data.monthlyTotals.map((item) => item.total), 1);
  const largeEventMonths = new Set(data.largeEvents.map((event) => {
    const date = new Date(event.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }));
  const sortedDayPatterns = [...data.dayOfMonthPatterns].sort((a, b) => b.count - a.count || a.day - b.day);
  const topDay = sortedDayPatterns[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏥 Insurance Events</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Track insurance spend, recurring patterns, and unusually large charges across the last 24 months.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Paid" value={formatCurrency(totalPaid)} subtitle="24-month insurance spend" />
        <Card title="Avg Transaction" value={formatCurrency(data.rollingAverage)} subtitle={`${data.allTransactions.length} insurance charges`} />
        <Card title="Large Events" value={`${data.largeEvents.length}`} subtitle="More than 2× average" className={data.largeEvents.length > 0 ? "border-red-500/30" : ""} />
        <Card title="Active Merchants" value={`${activeMerchants}`} subtitle="Unique top insurance payees" />
      </div>

      {data.largeEvents.length > 0 && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 text-red-300">🚨 Large Event Alerts</h2>
          <div className="space-y-3">
            {data.largeEvents.map((event, index) => (
              <div key={`${event.description}-${index}`} className="rounded-lg border border-red-500/20 bg-red-950/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm text-red-200">{formatDate(event.date)}</div>
                    <div className="font-medium text-zinc-100">{event.description}</div>
                    <div className="text-xs text-zinc-400 mt-1">{guessType(event.description)}</div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-red-200 text-lg">{formatCurrency(event.amount)}</div>
                    <span className="inline-flex rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300">
                      {event.multiplier.toFixed(1)}x avg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">📅 Monthly Timeline</h2>
        <div className="flex items-end gap-2 h-36">
          {data.monthlyTotals.map((month) => {
            const height = Math.round((month.total / maxMonthly) * 100);
            const isLargeEventMonth = largeEventMonths.has(month.month);
            return (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] text-zinc-400 font-mono">{month.count > 0 ? formatCurrency(month.total) : "—"}</span>
                <div
                  className={isLargeEventMonth ? "w-full rounded-t bg-red-700/70" : "w-full rounded-t bg-indigo-800/60"}
                  style={{ height: `${Math.max(height, month.total > 0 ? 4 : 2)}%` }}
                />
                <span className="text-[10px] text-zinc-500 truncate w-full text-center">{monthLabel(month.month)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">📆 Day-of-Month Patterns</h2>
          {sortedDayPatterns.length === 0 ? (
            <p className="text-zinc-500 text-sm">No insurance charge patterns detected yet.</p>
          ) : (
            <div className="space-y-3">
              {topDay?.day === 1 && (
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
                  Charges often hit on the 1st — likely monthly premiums.
                </div>
              )}
              <div className="space-y-2">
                {sortedDayPatterns.map((pattern) => (
                  <div key={pattern.day} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-zinc-200">Day {pattern.day}</div>
                      <div className="text-xs text-zinc-500">{pattern.count} charges</div>
                    </div>
                    <div className="font-mono text-zinc-300">{formatCurrency(pattern.totalAmount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">🏢 By Merchant</h2>
          {data.topMerchants.length === 0 ? (
            <p className="text-zinc-500 text-sm">No insurance merchants detected yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Charges</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.topMerchants.map((merchant) => (
                  <tr key={merchant.description} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 font-medium text-zinc-200">{merchant.description}</td>
                    <td className="py-2 text-right text-zinc-400">{merchant.count}</td>
                    <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(merchant.total)}</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(merchant.avgAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
