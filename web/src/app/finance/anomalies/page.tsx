import { getSpendingAnomalies } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

type CategorySpike = {
  category: string;
  thisMonth: number;
  avgPrior3: number;
  ratio: number;
  delta: number;
};

type LargeTransaction = {
  date?: Date | string;
  description: string;
  category: string;
  amount: number;
  avgCategoryAmount: number;
  ratio: number;
};

type NewMerchant = {
  merchant: string;
  total: number;
  firstSeen?: Date | string;
};

function spikeColor(ratio: number): string {
  if (ratio >= 2) return "text-red-400";
  if (ratio >= 1.5) return "text-yellow-400";
  return "text-orange-400";
}

export default async function SpendingAnomaliesPage() {
  const { categorySpikes, largeTransactions, newMerchants, summary, thresholds } = await getSpendingAnomalies() as {
    categorySpikes: CategorySpike[];
    largeTransactions: LargeTransaction[];
    newMerchants: NewMerchant[];
    summary: { totalCategorySpikes: number; totalLargeTransactions: number; totalNewMerchants: number };
    thresholds: { unknownCategoryAvg: number; newMerchantMinTotal: number };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spending Anomalies</h1>
        <p className="text-zinc-400 text-sm mt-1">Unusual patterns detected this month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          title="Category Spikes"
          value={`${summary.totalCategorySpikes}`}
          subtitle="40%+ vs 3-mo avg"
          className={summary.totalCategorySpikes > 0 ? "border-yellow-500/30" : ""}
        />
        <Card
          title="Large Transactions"
          value={`${summary.totalLargeTransactions}`}
          subtitle="3x+ category avg"
          className={summary.totalLargeTransactions > 0 ? "border-red-500/30" : ""}
        />
        <Card
          title="New Merchants"
          value={`${summary.totalNewMerchants}`}
          subtitle={`First-time spend > ${formatCurrency(thresholds.newMerchantMinTotal)}`}
          className={summary.totalNewMerchants > 0 ? "border-orange-500/30" : ""}
        />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Category Spikes</h2>
        {categorySpikes.length === 0 ? (
          <p className="text-zinc-500 text-sm">No category spikes detected this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">This Month</th>
                <th className="pb-2 font-medium text-right">3-Mo Avg</th>
                <th className="pb-2 font-medium text-right">Spike</th>
              </tr>
            </thead>
            <tbody>
              {categorySpikes.map((row, i) => (
                <tr key={`${row.category}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 font-medium text-zinc-200">{row.category}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(row.thisMonth)}</td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {row.avgPrior3 > 0 ? formatCurrency(row.avgPrior3) : "—"}
                  </td>
                  <td className={`py-2 text-right font-mono font-semibold ${spikeColor(row.ratio)}`}>
                    {row.ratio.toFixed(1)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Large Transactions</h2>
        {largeTransactions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No large transactions flagged this month.</p>
        ) : (
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
              {largeTransactions.map((tx, i) => {
                const note = tx.avgCategoryAmount > 0
                  ? `(${tx.ratio.toFixed(1)}x avg)`
                  : `(>${formatCurrency(thresholds.unknownCategoryAvg)})`;
                return (
                  <tr key={`${tx.description}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-400 font-mono whitespace-nowrap">
                      {tx.date ? formatDate(tx.date) : "—"}
                    </td>
                    <td className="py-2 text-zinc-200 max-w-[320px] truncate">{tx.description}</td>
                    <td className="py-2 text-zinc-400">{tx.category}</td>
                    <td className="py-2 text-right">
                      <div className="font-mono text-zinc-100">{formatCurrency(tx.amount)}</div>
                      <div className="text-xs text-zinc-500">{note}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">New Merchants</h2>
        {newMerchants.length === 0 ? (
          <p className="text-zinc-500 text-sm">No first-time merchants detected this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Note</th>
              </tr>
            </thead>
            <tbody>
              {newMerchants.map((m, i) => (
                <tr key={`${m.merchant}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-200">{m.merchant}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(m.total)}</td>
                  <td className="py-2 text-right text-orange-400 font-semibold">🆕 First time</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
