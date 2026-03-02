import { getAccountBalances, getMonthlyTotals, getCategorySpending, getRecentTransactions } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { MonthlyBarChart, CategoryDonut } from "@/components/finance/Charts";
import { SimpleTransactionRow } from "@/components/finance/TransactionRow";

export const dynamic = "force-dynamic";

type Account = {
  last_balance?: number;
};

type MonthlyTotals = {
  _id: string;
  income: number;
  expenses: number;
};

type CategoryTotal = {
  _id: string;
  total: number;
};

type Transaction = {
  transaction_id: string;
};

export default async function Dashboard() {
  const [accounts, monthly, categories, recent] = await Promise.all([
    getAccountBalances(),
    getMonthlyTotals(6),
    getCategorySpending(),
    getRecentTransactions(20),
  ]);

  const totalBalance = (accounts as Account[]).reduce((s, a) => s + (a.last_balance || 0), 0);
  const currentMonth = (monthly as MonthlyTotals[])[monthly.length - 1];
  const monthIncome = currentMonth?.income || 0;
  const monthExpenses = currentMonth?.expenses || 0;

  const serializedMonthly = JSON.parse(JSON.stringify(monthly)) as MonthlyTotals[];
  const serializedCategories = JSON.parse(JSON.stringify(categories)) as CategoryTotal[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Balance" value={formatCurrency(totalBalance)} subtitle={`${accounts.length} accounts`} />
        <Card title="This Month Income" value={formatCurrency(monthIncome)} />
        <Card title="This Month Expenses" value={formatCurrency(monthExpenses)} />
        <Card title="This Month Net" value={formatCurrency(monthIncome - monthExpenses)}
          className={monthIncome - monthExpenses >= 0 ? "border-emerald-500/30" : "border-red-500/30"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Income vs Expenses (6 months)</h2>
          <MonthlyBarChart data={serializedMonthly} />
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Spending by Category (This Month)</h2>
          <CategoryDonut data={serializedCategories} />
          <div className="grid grid-cols-2 gap-1 mt-4 text-xs">
            {serializedCategories.slice(0, 8).map((c, i) => (
              <div key={c._id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"][i] }} />
                <span className="text-zinc-400">{c._id}</span>
                <span className="ml-auto">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(recent as unknown as Transaction[]).map((t) => (
                <SimpleTransactionRow key={t.transaction_id} t={JSON.parse(JSON.stringify(t))} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
