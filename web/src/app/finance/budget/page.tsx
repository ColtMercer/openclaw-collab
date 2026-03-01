import { getCategorySpending, getCategories } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { CommentButton } from "@/components/finance/CommentButton";

export const dynamic = "force-dynamic";

type CategorySpending = {
  _id: string;
  total: number;
};

type Category = {
  category: string;
  group?: string;
  type?: string;
  monthly_budgets?: Record<string, number>;
};

type BudgetItem = {
  category: string;
  group?: string;
  budget: number;
  actual: number;
  diff: number;
};

export default async function BudgetPage() {
  const now = new Date();
  const monthKey = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  
  const [spending, categories] = await Promise.all([
    getCategorySpending(),
    getCategories(),
  ]);

  const spendingMap: Record<string, number> = {};
  (spending as CategorySpending[]).forEach((s) => { spendingMap[s._id] = s.total; });

  // Build budget items from categories that have budgets
  const budgetItems: BudgetItem[] = (categories as Category[])
    .filter((c) => c.type === "Expense")
    .map((c) => {
      const budget = c.monthly_budgets?.[monthKey] || 0;
      const actual = spendingMap[c.category] || 0;
      return { category: c.category, group: c.group, budget, actual, diff: budget - actual };
    })
    .sort((a, b) => b.actual - a.actual);

  const totalBudget = budgetItems.reduce((s, i) => s + i.budget, 0);
  const totalActual = budgetItems.reduce((s, i) => s + i.actual, 0);
  const itemsWithSpending = budgetItems.filter((i) => i.actual > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Budget — {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Budget" value={formatCurrency(totalBudget)} subtitle="Monthly budget set" />
        <Card title="Total Spent" value={formatCurrency(totalActual)} subtitle={`${itemsWithSpending.length} categories`} />
        <Card title="Remaining" value={formatCurrency(totalBudget - totalActual)}
          className={totalBudget - totalActual >= 0 ? "border-emerald-500/30" : "border-red-500/30"} />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold mb-2">Category Breakdown</h2>
        {itemsWithSpending.map((item) => {
          const pct = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 150) : 100;
          const overBudget = item.budget > 0 && item.actual > item.budget;
          const noBudget = item.budget === 0;

          return (
            <div key={item.category} className="space-y-1 group">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{overBudget ? "🔴" : noBudget ? "⚪" : "✅"}</span>
                  <span className="font-medium">{item.category}</span>
                  <span className="text-zinc-500 text-xs">({item.group})</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CommentButton description={item.category} amount={formatCurrency(item.actual)} category={item.category} page="budget" />
                  </span>
                </div>
                <div className="text-right">
                  <span className={overBudget ? "text-red-400" : "text-zinc-300"}>{formatCurrency(item.actual)}</span>
                  {item.budget > 0 && (
                    <span className="text-zinc-500"> / {formatCurrency(item.budget)}</span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    overBudget ? "bg-red-500" : noBudget ? "bg-zinc-600" : "bg-emerald-500"
                  }`}
                  style={{ width: `${noBudget ? 100 : Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {budgetItems.filter((i) => i.actual === 0 && i.budget > 0).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Budgeted but No Spending</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {budgetItems.filter((i) => i.actual === 0 && i.budget > 0).map((i) => (
              <div key={i.category} className="text-zinc-400">
                {i.category}: {formatCurrency(i.budget)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
