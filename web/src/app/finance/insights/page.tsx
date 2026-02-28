import { getInsightsData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { DowChart } from "@/components/finance/Charts";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { dow, merchants, trends } = await getInsightsData();

  const serializedDow = JSON.parse(JSON.stringify(dow));

  // Build category trend table
  const trendMonths = [...new Set(trends.map((t: any) => t._id.month))].sort();
  const trendCategories: Record<string, Record<string, number>> = {};
  trends.forEach((t: any) => {
    if (!trendCategories[t._id.category]) trendCategories[t._id.category] = {};
    trendCategories[t._id.category][t._id.month] = t.total;
  });
  // Get top 10 categories by total
  const catTotals = Object.entries(trendCategories).map(([cat, months]) => ({
    cat, total: Object.values(months).reduce((s, v) => s + v, 0),
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Average Spending by Day of Week</h2>
          <DowChart data={serializedDow} />
        </div>

        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Top Merchants</h2>
          <div className="space-y-2">
            {merchants.map((m: any, i: number) => {
              const maxTotal = merchants[0]?.total || 1;
              const pct = (m.total / maxTotal) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-xs">{m._id}</span>
                    <span className="text-zinc-400 ml-2 whitespace-nowrap">{formatCurrency(m.total)} ({m.count}x)</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Category Trends (Last 6 Months)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left pb-2 font-medium">Category</th>
              {trendMonths.map((m: any) => (
                <th key={m} className="text-right pb-2 font-medium px-3">{m}</th>
              ))}
              <th className="text-right pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {catTotals.map(({ cat, total }) => (
              <tr key={cat} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 font-medium">{cat}</td>
                {trendMonths.map((m: any) => (
                  <td key={m} className="py-2 text-right text-zinc-400 px-3">
                    {trendCategories[cat][m] ? formatCurrency(trendCategories[cat][m]) : "-"}
                  </td>
                ))}
                <td className="py-2 text-right font-mono">{formatCurrency(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
