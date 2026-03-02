import { getCategoryDetail } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { SpendBarChart } from "@/components/finance/Charts";

export const dynamic = "force-dynamic";

type CategoryTransaction = {
  transaction_id: string;
  date?: string | Date;
  description?: string;
  amount: number;
};

type CategoryMonthly = {
  month: string;
  total: number;
  count: number;
};

type MerchantRow = {
  _id: string;
  total: number;
  count: number;
};

type CategoryDetail = {
  transactions: CategoryTransaction[];
  monthlyTrend: CategoryMonthly[];
  topMerchants: MerchantRow[];
  stats: {
    avgMonthly: number;
    totalAllTime: number;
    transactionCount: number;
    maxSingle: number;
  };
};

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function CategoryDetailPage({ params }: { params: { name: string } }) {
  const decodedName = decodeURIComponent(params.name);
  const detail = await getCategoryDetail(decodedName, 12) as unknown as CategoryDetail;

  const chartData = detail.monthlyTrend.map((m) => ({
    label: formatMonthLabel(m.month),
    total: m.total,
  }));
  const recentTransactions = detail.transactions.slice(0, 50);
  const maxMerchantTotal = detail.topMerchants[0]?.total || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{decodedName}</h1>
        <p className="text-zinc-500 text-sm">Category drill-down • last 12 months</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Avg Monthly" value={formatCurrency(detail.stats.avgMonthly)} subtitle="Last 12 months" />
        <Card title="Total All Time" value={formatCurrency(detail.stats.totalAllTime)} subtitle="All-time spend" />
        <Card title="Transactions" value={detail.stats.transactionCount.toLocaleString()} subtitle="All time" />
        <Card title="Largest Single" value={formatCurrency(detail.stats.maxSingle)} subtitle="Largest charge" className="border-red-500/30" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly Spend</h2>
          <SpendBarChart data={chartData} />
        </div>

        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Top Merchants</h2>
          <div className="space-y-2">
            {detail.topMerchants.length === 0 && (
              <p className="text-sm text-zinc-500">No merchant data found.</p>
            )}
            {detail.topMerchants.map((m) => {
              const pct = (m.total / maxMerchantTotal) * 100;
              return (
                <div key={m._id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-xs">{m._id || "Unknown"}</span>
                    <span className="text-zinc-400 ml-2 whitespace-nowrap">
                      {formatCurrency(m.total)} ({m.count}x)
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <span className="text-xs text-zinc-500">Last {recentTransactions.length} transactions</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left bg-zinc-900/50">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                  No transactions found for this category.
                </td>
              </tr>
            )}
            {recentTransactions.map((t) => (
              <tr key={t.transaction_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">
                  {t.date ? formatDate(t.date) : "-"}
                </td>
                <td className="px-4 py-2 max-w-md truncate">{t.description}</td>
                <td className="px-4 py-2 text-right font-mono text-red-400">
                  {formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
