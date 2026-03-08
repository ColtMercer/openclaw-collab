import { Card } from "@/components/finance/Card";
import { getDayOfWeekSpending } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DayOfWeekPage() {
  const data = await getDayOfWeekSpending();
  const maxAvg = Math.max(...data.days.map((day) => day.avg), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📅 Day-of-Week Spending Patterns</h1>
        <p className="mt-1 text-sm text-zinc-400">Average spend by weekday across the recent transaction window.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Most Expensive Day" value={data.mostExpensiveDay?.day || "—"} subtitle={data.mostExpensiveDay ? `${formatCurrency(data.mostExpensiveDay.avg)} avg` : "No data"} className="border-amber-500/30" />
        <Card title="Cheapest Day" value={data.cheapestDay?.day || "—"} subtitle={data.cheapestDay ? `${formatCurrency(data.cheapestDay.avg)} avg` : "No data"} className="border-emerald-500/30" />
        <Card title="Transactions Analyzed" value={data.totalTransactionsAnalyzed.toLocaleString("en-US")} subtitle="Negative non-transfer transactions" />
        <Card title="Date Range" value={formatDate(data.dateRange.start)} subtitle={`to ${formatDate(data.dateRange.end)}`} />
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Weekday Average Spend</h2>
          <p className="text-sm text-zinc-500">Horizontal bar chart from Monday through Sunday</p>
        </div>

        <div className="space-y-3">
          {data.days.map((day) => {
            const isMostExpensive = data.mostExpensiveDay?.day === day.day;
            const width = Math.max((day.avg / maxAvg) * 100, day.avg > 0 ? 3 : 0);

            return (
              <div key={day.day} className="grid grid-cols-[56px_1fr_96px] items-center gap-3">
                <div className="text-sm font-medium text-zinc-300">{day.day}</div>
                <div className="h-8 overflow-hidden rounded-lg bg-zinc-800/80">
                  <div className={`flex h-full items-center justify-end rounded-lg pr-3 text-xs font-medium ${isMostExpensive ? "bg-amber-500 text-amber-950" : "bg-indigo-500/90 text-indigo-50"}`} style={{ width: `${width}%` }}>
                    {day.count > 0 ? `${day.count} tx` : ""}
                  </div>
                </div>
                <div className={`text-right font-mono text-sm ${isMostExpensive ? "text-amber-400" : "text-zinc-300"}`}>
                  {formatCurrency(day.avg)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Top Categories on {data.mostExpensiveDay?.day || "Top"} Day</h2>
            <p className="text-sm text-zinc-500">Top 5 categories for the most expensive weekday</p>
          </div>
        </div>

        {data.topCategoriesForMostExpensiveDay.length === 0 ? (
          <p className="text-sm text-zinc-500">No category data available for the selected weekday.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Avg</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.topCategoriesForMostExpensiveDay.map((category) => (
                  <tr key={category.category} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 font-medium text-zinc-200">{category.category}</td>
                    <td className="py-3 text-right font-mono text-zinc-300">{formatCurrency(category.avg)}</td>
                    <td className="py-3 text-right font-mono text-amber-400">{formatCurrency(category.total)}</td>
                    <td className="py-3 text-right text-zinc-400">{category.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
