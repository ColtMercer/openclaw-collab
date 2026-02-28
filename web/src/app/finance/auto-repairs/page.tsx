import { getAutoRepairTimeline } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const label = `${MONTHS[(month || 1) - 1]}`;
  return `${label} '${String(year || "").slice(2)}`;
}

function cleanShopName(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("integrity 1st")) return "Integrity 1st";
  if (lower.includes("rev-up") || lower.includes("revup")) return "Rev-Up";
  if (lower.includes("brakes plus")) return "Brakes Plus";
  if (lower.includes("autozone")) return "AutoZone";
  if (lower.includes("o'reilly") || lower.includes("oreilly")) return "O'Reilly";
  if (lower.includes("napa")) return "NAPA";
  if (lower.includes("advance auto")) return "Advance Auto";
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s#\d+.*$/i, "")
    .replace(/\b\d{4,}\b/g, "")
    .trim();
}

export default async function AutoRepairsPage() {
  const timeline = await getAutoRepairTimeline();

  const totalSpent = timeline.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const repairCount = timeline.length;
  const avgPerVisit = repairCount > 0 ? totalSpent / repairCount : 0;

  const monthlyMap = new Map<string, { total: number; count: number }>();
  const shopMap = new Map<string, { total: number; count: number }>();

  for (const item of timeline) {
    const date = item.date ? new Date(item.date) : null;
    const monthKey = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "unknown";

    const monthly = monthlyMap.get(monthKey) ?? { total: 0, count: 0 };
    monthly.total += item.amount || 0;
    monthly.count += 1;
    monthlyMap.set(monthKey, monthly);

    const shop = cleanShopName(item.description || "Unknown");
    const shopStats = shopMap.get(shop) ?? { total: 0, count: 0 };
    shopStats.total += item.amount || 0;
    shopStats.count += 1;
    shopMap.set(shop, shopStats);
  }

  const monthlyTotals = Array.from(monthlyMap.entries())
    .filter(([key]) => key !== "unknown")
    .map(([key, value]) => ({ _id: key, ...value }))
    .sort((a, b) => a._id.localeCompare(b._id));

  const shopBreakdown = Array.from(shopMap.entries())
    .map(([shop, value]) => ({ shop, ...value, avg: value.count ? value.total / value.count : 0 }))
    .sort((a, b) => b.total - a.total);

  const monthCount = monthlyTotals.length || (repairCount > 0 ? 1 : 0);
  const monthlyAverage = monthCount > 0 ? totalSpent / monthCount : 0;
  const maxMonthly = Math.max(...monthlyTotals.map((m) => m.total), 1);

  let runningTotal = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔧 Auto Repair Timeline</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Every repair and parts purchase, in chronological order.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Spent" value={formatCurrency(totalSpent)} subtitle="All auto repair activity" />
        <Card title="# of Repairs" value={`${repairCount}`} subtitle="Service visits + parts" />
        <Card title="Average Per Visit" value={formatCurrency(avgPerVisit)} subtitle="Mean repair cost" />
        <Card title="Monthly Average" value={formatCurrency(monthlyAverage)} subtitle={`${monthCount} months of spend`} />
      </div>

      {monthlyTotals.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly Spend</h2>
          <div className="flex items-end gap-2 h-32">
            {monthlyTotals.map((m) => {
              const height = Math.round((m.total / maxMonthly) * 100);
              return (
                <div key={m._id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{formatCurrency(m.total)}</span>
                  <div className="w-full rounded-t bg-indigo-800/60" style={{ height: `${Math.max(height, 4)}%` }} />
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{monthLabel(m._id)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Repair Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-zinc-500 text-sm">No auto repair transactions detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Shop</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Running Total</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((t: any, i: number) => {
                runningTotal += t.amount || 0;
                const date = t.date ? new Date(t.date) : null;
                return (
                  <tr key={`${t.description}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-300">
                      {date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="py-2 font-medium text-zinc-200">{cleanShopName(t.description || "Unknown")}</td>
                    <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(t.amount || 0)}</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(runningTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Shop Breakdown</h2>
        {shopBreakdown.length === 0 ? (
          <p className="text-zinc-500 text-sm">No shops detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Shop</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
                <th className="pb-2 font-medium text-right"># Visits</th>
                <th className="pb-2 font-medium text-right">Avg/Visit</th>
              </tr>
            </thead>
            <tbody>
              {shopBreakdown.map((s) => (
                <tr key={s.shop} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 font-medium text-zinc-200">{s.shop}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(s.total)}</td>
                  <td className="py-2 text-right text-zinc-400">{s.count}×</td>
                  <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(s.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
