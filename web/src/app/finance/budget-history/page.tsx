import { getBudgetHistory } from "@/lib/finance-queries";
import { Card } from "@/components/finance/Card";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BudgetHistoryRow = {
  category: string;
  group: string;
  budgets: Record<string, number>;
  actuals: Record<string, number>;
  totalActual: number;
};

type MonthSlot = { key: string; label: string };

type MonthTotals = { budget: number; actual: number; diff: number };

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTrend(row: BudgetHistoryRow, monthSlots: MonthSlot[]) {
  const firstTwo = monthSlots.slice(0, 2);
  const lastTwo = monthSlots.slice(-2);
  const sumFor = (slots: MonthSlot[]) =>
    slots.reduce((sum, slot) => sum + (row.actuals[slot.key] || 0), 0);
  const firstSum = sumFor(firstTwo);
  const lastSum = sumFor(lastTwo);

  if (lastSum > firstSum) {
    return { symbol: "↑", className: "text-red-400", label: "Up" };
  }
  if (lastSum < firstSum) {
    return { symbol: "↓", className: "text-emerald-400", label: "Down" };
  }
  return { symbol: "—", className: "text-zinc-500", label: "Flat" };
}

function getWorstMonthKey(row: BudgetHistoryRow, monthSlots: MonthSlot[]) {
  let worstKey = monthSlots[0]?.key ?? "";
  let worstDiff = Number.NEGATIVE_INFINITY;
  monthSlots.forEach((slot) => {
    const actual = row.actuals[slot.key] || 0;
    const budget = row.budgets[slot.key] || 0;
    const diff = actual - budget;
    if (diff > worstDiff) {
      worstDiff = diff;
      worstKey = slot.key;
    }
  });
  return worstKey;
}

function getMonthTotals(rows: BudgetHistoryRow[], monthSlots: MonthSlot[]): MonthTotals[] {
  return monthSlots.map((slot) => {
    let budget = 0;
    let actual = 0;
    rows.forEach((row) => {
      budget += row.budgets[slot.key] || 0;
      actual += row.actuals[slot.key] || 0;
    });
    return { budget, actual, diff: actual - budget };
  });
}

export default async function BudgetHistoryPage() {
  const { rows, monthSlots } = await getBudgetHistory(6);
  const orderedRows = (rows as BudgetHistoryRow[]).slice().sort((a, b) => b.totalActual - a.totalActual);
  const totalsByMonth = getMonthTotals(orderedRows, monthSlots as MonthSlot[]);

  const totalBudgeted = totalsByMonth.reduce((sum, m) => sum + m.budget, 0);
  const totalActual = totalsByMonth.reduce((sum, m) => sum + m.actual, 0);

  let worstMonthIndex = 0;
  let bestMonthIndex = 0;
  totalsByMonth.forEach((m, i) => {
    if (m.diff > totalsByMonth[worstMonthIndex].diff) worstMonthIndex = i;
    if (m.diff < totalsByMonth[bestMonthIndex].diff) bestMonthIndex = i;
  });

  const worstMonth = monthSlots[worstMonthIndex];
  const bestMonth = monthSlots[bestMonthIndex];
  const worstDiff = totalsByMonth[worstMonthIndex]?.diff ?? 0;
  const bestDiff = totalsByMonth[bestMonthIndex]?.diff ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Budget History</h1>
          <p className="text-sm text-zinc-500">Last 6 months of budget vs actual spending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Budgeted" value={formatCurrency(totalBudgeted)} subtitle="Across 6 months" />
        <Card title="Total Actual" value={formatCurrency(totalActual)} subtitle="Across 6 months" />
        <Card
          title="Worst Month"
          value={worstMonth?.label ?? "—"}
          subtitle={worstMonth ? `${worstDiff >= 0 ? "Over" : "Under"} by ${formatCurrency(Math.abs(worstDiff))}` : "—"}
          className={worstDiff > 0 ? "border-red-500/40" : "border-zinc-800"}
        />
        <Card
          title="Best Month"
          value={bestMonth?.label ?? "—"}
          subtitle={bestMonth ? `${bestDiff <= 0 ? "Under" : "Over"} by ${formatCurrency(Math.abs(bestDiff))}` : "—"}
          className={bestDiff < 0 ? "border-emerald-500/40" : "border-zinc-800"}
        />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left bg-zinc-900/50">
                <th className="px-4 py-3 font-medium">Category</th>
                {(monthSlots as MonthSlot[]).map((slot) => (
                  <th key={slot.key} className="px-3 py-3 font-medium text-right whitespace-nowrap">{slot.label}</th>
                ))}
                <th className="px-4 py-3 font-medium text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((row) => {
                const worstMonthKey = getWorstMonthKey(row, monthSlots as MonthSlot[]);
                const trend = getTrend(row, monthSlots as MonthSlot[]);

                return (
                  <tr key={row.category} className="border-t border-[#27272a]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{row.category}</div>
                      {row.group && <div className="text-xs text-zinc-500">{row.group}</div>}
                    </td>
                    {(monthSlots as MonthSlot[]).map((slot) => {
                      const actual = row.actuals[slot.key] || 0;
                      const budget = row.budgets[slot.key] || 0;
                      const overBudget = budget > 0 && actual > budget;
                      const underBudget = budget > 0 && actual < budget;
                      const isWorst = slot.key === worstMonthKey;

                      return (
                        <td
                          key={slot.key}
                          className={`px-3 py-3 text-right whitespace-nowrap ${
                            overBudget
                              ? "bg-red-500/10"
                              : underBudget
                                ? "bg-emerald-500/10"
                                : ""
                          }`}
                        >
                          <span className={isWorst ? "font-semibold" : ""}>
                            {formatAmount(actual)}{isWorst ? " *" : ""}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center font-semibold ${trend.className}`}>
                        {trend.symbol}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
