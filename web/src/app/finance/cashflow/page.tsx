import { getCashFlowProjection } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function runwayColor(days: number): string {
  if (days > 90) return "text-emerald-400";
  if (days > 30) return "text-yellow-400";
  return "text-red-400";
}

function runwayBg(days: number): string {
  if (days > 90) return "bg-emerald-500/10 border-emerald-500/30";
  if (days > 30) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

type CashflowAccount = {
  last_balance?: number;
};

type CashflowMonth = {
  _id: string;
  income: number;
  expenses: number;
};

type RecurringPattern = {
  average_amount: number;
  frequency?: string;
  sample_description?: string;
  description?: string;
  category?: string;
};

type IncomeSource = {
  _id: string;
  total: number;
  count: number;
};

type CashflowProjection = {
  accounts: CashflowAccount[];
  monthlyData: CashflowMonth[];
  recurringPatterns: RecurringPattern[];
  incomeSources: IncomeSource[];
};

function getRunwayDate(base: Date, runwayDays: number) {
  return new Date(base.getTime() + runwayDays * 86400000);
}

export default async function CashFlowPage() {
  const { accounts, monthlyData, recurringPatterns, incomeSources } = await getCashFlowProjection() as CashflowProjection;

  // Total liquid balance
  const totalBalance = accounts.reduce((s, a) => s + (a.last_balance || 0), 0);

  // Avg monthly income/expenses over last 3 months (exclude anomaly months > 30K income)
  const recentMonths = monthlyData.slice(-3);
  const avgIncome = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => {
        // Cap income at 15K to exclude bonus/RSU anomaly months
        return s + Math.min(m.income, 15000);
      }, 0) / recentMonths.length
    : 0;
  const avgExpenses = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.expenses, 0) / recentMonths.length
    : 0;
  const avgNet = avgIncome - avgExpenses;
  const avgDailyBurn = avgExpenses / 30.44;

  // Runway calculation
  const runwayDays = avgDailyBurn > 0 ? Math.floor(totalBalance / avgDailyBurn) : 9999;
  const now = new Date();
  const runwayDate = getRunwayDate(now, runwayDays);

  // Build 3-month projection
  const projections = [1, 2, 3].map((offset) => {
    const month = addMonths(now, offset);
    const projectedBalance = totalBalance + avgNet * offset;
    return {
      month: formatMonthLabel(month),
      income: avgIncome,
      expenses: avgExpenses,
      net: avgNet,
      balance: projectedBalance,
    };
  });

  // Top recurring expenses sorted by amount
  const topRecurring = recurringPatterns
    .filter((p) => Math.abs(p.average_amount) >= 10)
    .sort((a, b) => Math.abs(b.average_amount) - Math.abs(a.average_amount))
    .slice(0, 15);

  // Monthly recurring total
  const recurringMonthly = recurringPatterns
    .filter((p) => (p.frequency || "").toLowerCase().includes("month"))
    .reduce((s, p) => s + Math.abs(p.average_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📈 Cash Flow Predictor</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Forward-looking projection based on your last 3 months of spending.
        </p>
      </div>

      {/* Current Position */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Liquid Balance"
          value={formatCurrency(totalBalance)}
          subtitle={`${accounts.length} accounts`}
        />
        <Card
          title="Avg Monthly Income"
          value={formatCurrency(avgIncome)}
          subtitle="3-month average (capped)"
          className="border-emerald-500/30"
        />
        <Card
          title="Avg Monthly Expenses"
          value={formatCurrency(avgExpenses)}
          subtitle="3-month average"
          className="border-red-500/30"
        />
        <Card
          title="Avg Monthly Net"
          value={formatCurrency(avgNet)}
          subtitle={avgNet >= 0 ? "Positive cash flow ✓" : "Burning cash ⚠️"}
          className={avgNet >= 0 ? "border-emerald-500/30" : "border-red-500/30"}
        />
      </div>

      {/* Runway */}
      <div className={`border rounded-xl p-5 ${runwayBg(runwayDays)}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-300 mb-1">Cash Runway</h2>
            <div className={`text-5xl font-bold font-mono ${runwayColor(runwayDays)}`}>
              {runwayDays > 999 ? "∞" : `${runwayDays}d`}
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              At your avg burn rate of{" "}
              <strong className="text-zinc-200">{formatCurrency(avgDailyBurn)}/day</strong>
              {runwayDays <= 999 && (
                <>
                  {" "}your savings run out around{" "}
                  <strong className={runwayColor(runwayDays)}>
                    {runwayDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </strong>
                </>
              )}
            </p>
          </div>
          <div className="text-right text-sm text-zinc-400 space-y-1">
            <div>Monthly burn: <span className="text-zinc-200 font-mono">{formatCurrency(avgExpenses)}</span></div>
            <div>Monthly income: <span className="text-zinc-200 font-mono">{formatCurrency(avgIncome)}</span></div>
            <div>Monthly deficit: <span className={`font-mono font-semibold ${avgNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(avgNet)}</span></div>
          </div>
        </div>
      </div>

      {/* 3-month projection */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">3-Month Projection</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium text-right">Projected Income</th>
                <th className="pb-2 font-medium text-right">Projected Expenses</th>
                <th className="pb-2 font-medium text-right">Net</th>
                <th className="pb-2 font-medium text-right">Est. Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Current month row */}
              <tr className="border-b border-zinc-800/40 bg-zinc-800/10">
                <td className="py-2 font-medium text-zinc-300">
                  {formatMonthLabel(now)} <span className="text-xs text-zinc-500">(current)</span>
                </td>
                <td className="py-2 text-right font-mono text-zinc-400">—</td>
                <td className="py-2 text-right font-mono text-zinc-400">—</td>
                <td className="py-2 text-right font-mono text-zinc-400">—</td>
                <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(totalBalance)}</td>
              </tr>
              {projections.map((p, i) => (
                <tr key={i} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${p.balance < 0 ? "bg-red-500/5" : ""}`}>
                  <td className="py-2 font-medium text-zinc-300">{p.month}</td>
                  <td className="py-2 text-right font-mono text-emerald-400">{formatCurrency(p.income)}</td>
                  <td className="py-2 text-right font-mono text-red-400">{formatCurrency(p.expenses)}</td>
                  <td className={`py-2 text-right font-mono font-semibold ${p.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {p.net >= 0 ? "+" : ""}{formatCurrency(p.net)}
                  </td>
                  <td className={`py-2 text-right font-mono font-bold ${p.balance < 0 ? "text-red-500" : p.balance < 5000 ? "text-yellow-400" : "text-zinc-100"}`}>
                    {p.balance < 0 ? "⚠️ " : ""}{formatCurrency(Math.max(p.balance, 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-500 text-xs mt-3">
          * Projection uses 3-month average. Income capped at $15K/mo to exclude RSU/bonus anomalies.
          Actual results depend on income variability and one-time expenses.
        </p>
      </div>

      {/* Recurring expenses */}
      {topRecurring.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Known Upcoming Recurring Expenses</h2>
            <span className="text-sm text-zinc-400">
              Monthly total: <span className="text-zinc-200 font-mono font-semibold">{formatCurrency(recurringMonthly)}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Frequency</th>
                  <th className="pb-2 font-medium text-right">Est. Amount</th>
                </tr>
              </thead>
              <tbody>
                {topRecurring.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 max-w-[240px] truncate text-zinc-200">{p.sample_description || p.description}</td>
                    <td className="py-2">
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{p.category || "—"}</span>
                    </td>
                    <td className="py-2 text-zinc-400 text-xs">{p.frequency || "monthly"}</td>
                    <td className="py-2 text-right font-mono text-red-400 font-semibold">
                      {formatCurrency(Math.abs(p.average_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent income sources */}
      {incomeSources.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Recent Income Sources <span className="text-zinc-500 text-sm font-normal">(last 60 days)</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {incomeSources.map((src, i) => (
              <div key={i} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">{src._id}</div>
                  <div className="text-xs text-zinc-500">{src.count}× deposit</div>
                </div>
                <div className="text-emerald-400 font-mono font-semibold text-sm">{formatCurrency(src.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
