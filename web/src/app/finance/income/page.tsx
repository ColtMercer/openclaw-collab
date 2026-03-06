import { getIncomeBreakdown } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { SpendBarChart } from "@/components/finance/Charts";

export const dynamic = "force-dynamic";

type IncomeMonth = {
  month: string;
  total: number;
  count: number;
};

type IncomeSource = {
  description: string;
  total: number;
  count: number;
  avgAmount: number;
  lastDate: Date | string;
};

type IncomeStats = {
  thisMonthTotal: number;
  lastMonthTotal: number;
  avgMonthly: number;
  totalYTD: number;
  momChange: number;
};

type IncomeTransaction = {
  date: Date | string;
  description: string;
  amount: number;
};

type IncomeBreakdown = {
  monthlyIncome: IncomeMonth[];
  incomeSources: IncomeSource[];
  stats: IncomeStats;
  largestTransactions: IncomeTransaction[];
};

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function IncomePage() {
  const { monthlyIncome, incomeSources, stats, largestTransactions } = await getIncomeBreakdown() as unknown as IncomeBreakdown;

  const chartData = monthlyIncome.map((m) => ({
    label: formatMonthLabel(m.month),
    total: m.total,
  }));

  const momPct = stats.momChange * 100;
  const momLabel = `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%`;
  const momBadgeClass = stats.momChange >= 0
    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : "text-red-400 border-red-500/30 bg-red-500/10";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Income</h1>
        <p className="text-zinc-400 text-sm mt-1">Income sources and trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="This Month"
          value={formatCurrency(stats.thisMonthTotal)}
          subtitle="Current month income"
          className="border-emerald-500/20"
        />
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Last Month</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${momBadgeClass}`}>
              {momLabel}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(stats.lastMonthTotal)}</p>
          <p className="text-xs text-zinc-500 mt-1">MoM change vs this month</p>
        </div>
        <Card
          title="Avg Monthly (12mo)"
          value={formatCurrency(stats.avgMonthly)}
          subtitle="Rolling 12-month avg"
        />
        <Card
          title="YTD Total"
          value={formatCurrency(stats.totalYTD)}
          subtitle="Since Jan 1"
        />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Monthly Income</h2>
          <span className="text-xs text-zinc-500">Last 12 months</span>
        </div>
        <SpendBarChart data={chartData} />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Income Sources</h2>
        {incomeSources.length === 0 ? (
          <p className="text-sm text-zinc-500">No income sources found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Avg Amount</th>
                  <th className="pb-2 font-medium text-right">Times</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {incomeSources.map((source) => (
                  <tr key={source.description} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-200">{source.description}</td>
                    <td className="py-2 text-right font-mono text-emerald-400">
                      {formatCurrency(source.avgAmount)}
                    </td>
                    <td className="py-2 text-right font-mono text-zinc-300">{source.count}</td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                      {formatCurrency(source.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Largest Single Transactions</h2>
        {largestTransactions.length === 0 ? (
          <p className="text-sm text-zinc-500">No income transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {largestTransactions.map((tx, i) => (
                  <tr key={`${tx.description}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-400">{formatDate(tx.date)}</td>
                    <td className="py-2 text-zinc-200">{tx.description}</td>
                    <td className="py-2 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrency(tx.amount)}
                    </td>
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
