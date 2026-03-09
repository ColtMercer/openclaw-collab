import { Card } from "@/components/finance/Card";
import { getWeekendVsWeekdaySpending } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WeekendVsWeekdayPage() {
  const data = await getWeekendVsWeekdaySpending();
  const ratioClassName = data.weekendToWeekdayRatio > 1
    ? "border-amber-500/30"
    : data.weekendToWeekdayRatio > 0
      ? "border-emerald-500/30"
      : "";
  const ratioTextClassName = data.weekendToWeekdayRatio > 1
    ? "text-amber-400"
    : data.weekendToWeekdayRatio > 0
      ? "text-emerald-400"
      : "text-zinc-300";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🗓️ Weekend vs Weekday Spending</h1>
        <p className="mt-1 text-sm text-zinc-400">Compare average daily spend and category mix across the last three months.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card title="Avg Weekday Spend / Day" value={formatCurrency(data.avgWeekdaySpendPerDay)} subtitle="Monday through Friday" className="border-indigo-500/30" />
        <Card title="Avg Weekend Spend / Day" value={formatCurrency(data.avgWeekendSpendPerDay)} subtitle="Saturday and Sunday" className="border-indigo-500/30" />
        <Card title="Weekend vs Weekday" value={`${data.weekendToWeekdayRatio.toFixed(1)}×`} subtitle={data.weekendToWeekdayRatio > 1 ? "more on weekends" : data.weekendToWeekdayRatio > 0 ? "less on weekends" : "No weekday baseline"} className={ratioClassName} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Transactions Analyzed" value={data.totalTransactions.toLocaleString("en-US")} subtitle="Negative non-transfer transactions" />
        <Card title="Date Range" value={formatDate(data.dateRange.start)} subtitle={`to ${formatDate(data.dateRange.end)}`} />
        <div className={`bg-[#141420] border border-[#27272a] rounded-xl p-5 sm:col-span-2 ${ratioClassName}`}>
          <p className="text-sm text-zinc-400 mb-1">Weekend Multiplier</p>
          <p className={`text-2xl font-bold tracking-tight ${ratioTextClassName}`}>
            {data.weekendToWeekdayRatio.toFixed(1)}× {data.weekendToWeekdayRatio > 1 ? "more on weekends" : data.weekendToWeekdayRatio > 0 ? "on weekdays than weekends" : "vs weekdays"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Based on average spend per day across weekend and weekday dates with spending.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Top Categories</h2>
            <p className="text-sm text-zinc-500">Average transaction size and counts split by weekday versus weekend</p>
          </div>
        </div>

        {data.topCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">No category data available for the selected date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Weekday Avg</th>
                  <th className="pb-2 text-right font-medium">Weekend Avg</th>
                  <th className="pb-2 text-right font-medium">Weekday Tx</th>
                  <th className="pb-2 text-right font-medium">Weekend Tx</th>
                </tr>
              </thead>
              <tbody>
                {data.topCategories.map((category) => (
                  <tr key={category.category} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 font-medium text-zinc-200">{category.category}</td>
                    <td className="py-3 text-right font-mono text-indigo-300">{formatCurrency(category.weekdayAvg)}</td>
                    <td className="py-3 text-right font-mono text-indigo-100">{formatCurrency(category.weekendAvg)}</td>
                    <td className="py-3 text-right text-zinc-400">{category.weekdayCount}</td>
                    <td className="py-3 text-right text-zinc-400">{category.weekendCount}</td>
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
