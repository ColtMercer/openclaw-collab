import { getMonthlySavingsRate } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { SavingsRateChart } from "@/components/finance/SavingsRateChart";

export const dynamic = "force-dynamic";

function rateColor(rate: number): string {
  if (rate >= 20) return "text-emerald-400";
  if (rate >= 10) return "text-yellow-400";
  return "text-red-400";
}

function rateCellClass(rate: number): string {
  if (rate >= 20) return "text-emerald-400";
  if (rate >= 10) return "text-yellow-400";
  return "text-red-400";
}

export default async function SavingsRatePage() {
  const data = await getMonthlySavingsRate(12);

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">💰 Savings Rate</h1>
        <p className="text-zinc-400">No transaction data found.</p>
      </div>
    );
  }

  const serialized = JSON.parse(JSON.stringify(data));

  const currentRate = data[data.length - 1]?.savingsRate ?? 0;
  const last3 = data.slice(-3);
  const avg3 = last3.reduce((s, d) => s + d.savingsRate, 0) / last3.length;
  const last6 = data.slice(-6);
  const avg6 = last6.reduce((s, d) => s + d.savingsRate, 0) / last6.length;
  const best = [...data].sort((a, b) => b.savingsRate - a.savingsRate)[0];

  function shortLabel(key: string) {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const insightStatus = avg6 >= 20 ? "✅" : avg6 >= 10 ? "⚠️" : "🔴";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💰 Savings Rate</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Monthly savings as a percentage of income — last 12 months.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="This Month"
          value={`${currentRate.toFixed(1)}%`}
          subtitle={data[data.length - 1]?._id ? shortLabel(data[data.length - 1]._id) : ""}
          className={currentRate >= 20 ? "border-emerald-500/30" : currentRate >= 10 ? "border-yellow-500/30" : "border-red-500/30"}
        />
        <Card
          title="3-Month Avg"
          value={`${avg3.toFixed(1)}%`}
          subtitle="Rolling average"
          className={avg3 >= 20 ? "border-emerald-500/30" : avg3 >= 10 ? "border-yellow-500/30" : "border-red-500/30"}
        />
        <Card
          title="6-Month Avg"
          value={`${avg6.toFixed(1)}%`}
          subtitle="Rolling average"
          className={avg6 >= 20 ? "border-emerald-500/30" : avg6 >= 10 ? "border-yellow-500/30" : "border-red-500/30"}
        />
        <Card
          title="Best Month"
          value={`${best.savingsRate.toFixed(1)}%`}
          subtitle={shortLabel(best._id)}
          className="border-indigo-500/30"
        />
      </div>

      {/* Chart */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Monthly Savings Rate</h2>
          <div className="flex gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥ 20%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 10–20%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt; 10%</span>
          </div>
        </div>
        <SavingsRateChart data={serialized} />
        <p className="text-xs text-zinc-500 mt-2">
          * Income capped at $15,000/mo to exclude RSU/bonus anomaly months.
          Green dashed line = 20% target.
        </p>
      </div>

      {/* Insight callout */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
        <p className="text-sm text-zinc-200">
          {insightStatus}{" "}
          <strong>The 50/30/20 rule</strong> suggests saving at least <strong>20%</strong> of take-home income.
          Your 6-month average is{" "}
          <span className={`font-bold ${rateColor(avg6)}`}>{avg6.toFixed(1)}%</span>.
          {avg6 >= 20
            ? " You're ahead of the target — great discipline!"
            : avg6 >= 10
            ? " You're building savings but have room to grow."
            : " You're saving below the recommended threshold — consider cutting discretionary spending."}
        </p>
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800">
              <th className="pb-2 font-medium">Month</th>
              <th className="pb-2 font-medium text-right">Income (capped)</th>
              <th className="pb-2 font-medium text-right">Expenses</th>
              <th className="pb-2 font-medium text-right">Net</th>
              <th className="pb-2 font-medium text-right">Savings Rate</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((row) => (
              <tr key={row._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 font-medium text-zinc-300">{shortLabel(row._id)}</td>
                <td className="py-2 text-right font-mono text-emerald-400">{formatCurrency(row.cappedIncome)}</td>
                <td className="py-2 text-right font-mono text-red-400">{formatCurrency(row.expenses)}</td>
                <td className={`py-2 text-right font-mono ${row.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {row.net >= 0 ? "+" : ""}{formatCurrency(row.net)}
                </td>
                <td className={`py-2 text-right font-mono font-semibold ${rateCellClass(row.savingsRate)}`}>
                  {row.savingsRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
