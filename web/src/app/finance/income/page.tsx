import { Card } from "@/components/finance/Card";
import { getIncomeBreakdown, type IncomeBreakdownResult } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getPercentTone(value: number | null) {
  if (value === null) return "text-zinc-400";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-300";
}

function getBadgeTone(frequency: IncomeBreakdownResult["payFrequency"]) {
  if (frequency === "Bi-weekly") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (frequency === "Monthly") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (frequency === "Weekly") return "bg-violet-500/15 text-violet-300 border-violet-500/30";
  return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
}

export default async function IncomePage() {
  const data = await getIncomeBreakdown();
  const maxTrend = Math.max(...data.trend.map((item) => item.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💰 Income Breakdown</h1>
        <p className="text-zinc-400 text-sm mt-1">Income sources, cadence, and trend for {data.month}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Total Income This Month" value={formatCurrency(data.totalIncome)} subtitle={data.month} className="border-emerald-500/30" />
        <Card title="Month-over-Month Change" value={formatPercent(data.monthOverMonthChangePct)} subtitle="vs previous month" className={data.monthOverMonthChangePct !== null && data.monthOverMonthChangePct >= 0 ? "border-emerald-500/30" : "border-red-500/30"} />
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-2">Pay Frequency</p>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getBadgeTone(data.payFrequency)}`}>
            {data.payFrequency}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Income by Source</h2>
          <div className="space-y-3">
            {data.incomeSources.map((source, index) => (
              <div key={source.source}>
                <div className="flex items-center gap-3 text-sm mb-1">
                  <span className="text-zinc-500 w-6">#{index + 1}</span>
                  <span className="font-medium text-zinc-200 truncate">{source.source}</span>
                  <span className="ml-auto font-mono">{formatCurrency(source.amount)}</span>
                  <span className="text-zinc-500 w-12 text-right">{source.percentage.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(source.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">12-Month Income Trend</h2>
          <div className="flex items-end gap-2 h-56">
            {data.trend.map((point) => {
              const height = `${Math.max((point.total / maxTrend) * 100, point.total > 0 ? 6 : 0)}%`;
              return (
                <div key={point.month} className="flex-1 flex flex-col justify-end items-center gap-2 min-w-0">
                  <div className="w-full bg-zinc-800 rounded-t-md overflow-hidden flex items-end h-full">
                    <div className="w-full bg-indigo-500/80 hover:bg-indigo-400 transition-colors rounded-t-md" style={{ height }} title={`${point.month}: ${formatCurrency(point.total)}`} />
                  </div>
                  <div className="text-[10px] text-zinc-500">{point.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-lg font-semibold">Largest Income Transactions</h2>
          <span className={`text-sm font-medium ${getPercentTone(data.monthOverMonthChangePct)}`}>
            {formatPercent(data.monthOverMonthChangePct)} MoM
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.topTransactions.map((transaction) => (
              <tr key={`${transaction.transaction_id || transaction.description}-${String(transaction.date)}`} className="border-b border-zinc-900/80 last:border-0">
                <td className="py-3 text-zinc-400 whitespace-nowrap">{formatDate(transaction.date)}</td>
                <td className="py-3 text-zinc-200">{transaction.description}</td>
                <td className="py-3 text-zinc-500">{transaction.category || "—"}</td>
                <td className="py-3 text-right font-mono text-emerald-400">{formatCurrency(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
