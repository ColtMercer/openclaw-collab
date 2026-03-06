import Link from "next/link";
import { getMonthlyBudgetHistory } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type BudgetHistoryRow = {
  category: string;
  group?: string;
  budgets: Record<string, number>;
  actuals: Record<string, number>;
  totalActual: number;
};

type MonthSlot = {
  year: number;
  month: number;
  key: string;
  label: string;
  budgetKey: string;
};

export default async function BudgetHistoryPage() {
  const { rows, monthSlots } = await getMonthlyBudgetHistory(6) as {
    rows: BudgetHistoryRow[];
    monthSlots: MonthSlot[];
  };

  const monthKeys = monthSlots.map((slot) => slot.key);
  const totals: Record<string, { budget: number; actual: number }> = {};
  monthKeys.forEach((key) => { totals[key] = { budget: 0, actual: 0 }; });

  rows.forEach((row) => {
    monthKeys.forEach((key) => {
      totals[key].budget += row.budgets[key] || 0;
      totals[key].actual += row.actuals[key] || 0;
    });
  });

  const lastKey = monthKeys[monthKeys.length - 1];
  const prevKey = monthKeys[monthKeys.length - 2];

  const getTrend = (row: BudgetHistoryRow) => {
    const prev = row.actuals[prevKey] || 0;
    const last = row.actuals[lastKey] || 0;
    if (last > prev) return { icon: "▲", label: "Up", className: "text-red-400" };
    if (last < prev) return { icon: "▼", label: "Down", className: "text-emerald-400" };
    return { icon: "→", label: "Flat", className: "text-zinc-400" };
  };

  const getWorstMonthKey = (row: BudgetHistoryRow) => {
    let worstKey: string | null = null;
    let worstDelta = 0;
    monthKeys.forEach((key) => {
      const budget = row.budgets[key] || 0;
      const actual = row.actuals[key] || 0;
      const delta = actual - budget;
      if (delta > worstDelta) {
        worstDelta = delta;
        worstKey = key;
      }
    });
    return worstDelta > 0 ? worstKey : null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Budget History</h1>
        <p className="text-zinc-500">Last 6 months of budget vs. actual spending</p>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="text-left bg-zinc-900/50 text-zinc-400">
              <th className="px-4 py-3 font-medium w-56">Category</th>
              {monthSlots.map((slot) => {
                const budget = totals[slot.key]?.budget || 0;
                const actual = totals[slot.key]?.actual || 0;
                const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
                const pctClass = budget === 0 ? "text-zinc-500" : pct > 100 ? "text-red-400" : "text-emerald-400";
                const monthLabel = new Date(slot.year, slot.month, 1).toLocaleDateString("en-US", { month: "short" });

                return (
                  <th key={slot.key} className="px-3 py-3 font-medium text-center">
                    <div className="text-sm text-zinc-200">{monthLabel}</div>
                    <div className={`text-xs ${pctClass}`}>
                      {budget === 0 ? "No budget" : `${pct}% used`}
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 font-medium text-center w-28">Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#27272a] bg-zinc-900/40">
              <td className="px-4 py-3 font-semibold text-zinc-200">Total</td>
              {monthKeys.map((key) => {
                const budget = totals[key]?.budget || 0;
                const actual = totals[key]?.actual || 0;
                const diff = budget - actual;
                const diffClass = diff >= 0 ? "text-emerald-400" : "text-red-400";
                return (
                  <td key={`total-${key}`} className="px-3 py-3 text-center">
                    <div className="text-[11px] text-zinc-500">Budget {formatCurrency(budget)}</div>
                    <div className="text-sm text-zinc-200">{formatCurrency(actual)}</div>
                    <div className={`text-xs ${diffClass}`}>
                      {diff >= 0 ? "+" : "-"}{formatCurrency(Math.abs(diff))}
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-center text-zinc-500">—</td>
            </tr>

            {rows.map((row) => {
              const worstKey = getWorstMonthKey(row);
              const trend = getTrend(row);
              return (
                <tr key={row.category} className="border-t border-[#27272a]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/finance/category/${encodeURIComponent(row.category)}`}
                      className="font-medium text-zinc-100 hover:text-indigo-300 transition-colors"
                    >
                      {row.category}
                    </Link>
                    {row.group && (
                      <div className="text-xs text-zinc-500">{row.group}</div>
                    )}
                  </td>
                  {monthKeys.map((key) => {
                    const budget = row.budgets[key] || 0;
                    const actual = row.actuals[key] || 0;
                    const overBudget = budget > 0 ? actual > budget : actual > 0;
                    const worst = overBudget && worstKey === key;
                    const cellClass = overBudget
                      ? worst
                        ? "bg-red-500/30 text-red-100 border border-red-400/30"
                        : "bg-red-500/15 text-red-200"
                      : budget > 0
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-zinc-800/40 text-zinc-300";

                    return (
                      <td key={`${row.category}-${key}`} className={`px-3 py-3 text-center ${cellClass}`}>
                        {formatCurrency(actual)}
                      </td>
                    );
                  })}
                  <td className={`px-4 py-3 text-center font-medium ${trend.className}`}>
                    {trend.icon} {trend.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
