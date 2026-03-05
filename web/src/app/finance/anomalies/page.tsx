import { getSpendingAnomalies } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

type LargeTransaction = {
  date: Date | string;
  description: string;
  category: string;
  amount: number;
  categoryAvg: number;
  multiple: number;
};

type CategorySpike = {
  category: string;
  currentTotal: number;
  avgPrior3: number;
  ratio: number;
};

type NewMerchant = {
  merchant: string;
  firstSeen: Date | string;
  category: string;
  total: number;
  count: number;
  largestAmount: number;
};

type FrequencySpike = {
  merchant: string;
  currentCount: number;
  avgPrior3: number;
  ratio: number;
  lastSeen?: Date | string;
  category: string;
};

export default async function SpendingAnomaliesPage() {
  const {
    largeTransactions,
    categorySpikes,
    newMerchants,
    frequencySpikes,
    currentMonthKey,
  } = await getSpendingAnomalies() as {
    largeTransactions: LargeTransaction[];
    categorySpikes: CategorySpike[];
    newMerchants: NewMerchant[];
    frequencySpikes: FrequencySpike[];
    currentMonthKey: string;
  };

  const totalAnomalies =
    largeTransactions.length +
    categorySpikes.length +
    newMerchants.length +
    frequencySpikes.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Spending Anomaly Detector</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Flags outliers across transactions, categories, and merchant frequency.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full text-sm font-semibold">
          {totalAnomalies} anomalies
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Large Transactions"
          value={`${largeTransactions.length}`}
          subtitle="2x category avg"
          className={largeTransactions.length > 0 ? "border-red-500/30" : ""}
        />
        <Card
          title="Category Spikes"
          value={`${categorySpikes.length}`}
          subtitle="1.5x 3-mo avg"
          className={categorySpikes.length > 0 ? "border-yellow-500/30" : ""}
        />
        <Card
          title="New Merchants"
          value={`${newMerchants.length}`}
          subtitle="$20+ this month"
          className={newMerchants.length > 0 ? "border-indigo-500/30" : ""}
        />
        <Card
          title="Frequency Spikes"
          value={`${frequencySpikes.length}`}
          subtitle="Count anomalies"
          className={frequencySpikes.length > 0 ? "border-orange-500/30" : ""}
        />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Large Transactions</h2>
          <span className="text-xs text-zinc-500">Last 90 days</span>
        </div>
        {largeTransactions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No large outliers detected.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Category Avg</th>
                <th className="pb-2 font-medium text-right">Multiple</th>
              </tr>
            </thead>
            <tbody>
              {largeTransactions.map((tx, i) => (
                <tr key={`${tx.description}-${tx.amount}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="py-2 max-w-[320px] truncate font-medium text-zinc-200">
                    {tx.description}
                  </td>
                  <td className="py-2 text-zinc-400">{tx.category}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {formatCurrency(tx.categoryAvg)}
                  </td>
                  <td className="py-2 text-right text-red-300 font-semibold">
                    {tx.multiple.toFixed(1)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Category Spikes</h2>
          <span className="text-xs text-zinc-500">Month {currentMonthKey}</span>
        </div>
        {categorySpikes.length === 0 ? (
          <p className="text-zinc-500 text-sm">No category spikes detected.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Current Total</th>
                <th className="pb-2 font-medium text-right">3-mo Avg</th>
                <th className="pb-2 font-medium text-right">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {categorySpikes.map((row, i) => (
                <tr key={`${row.category}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 font-medium text-zinc-200">{row.category}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">
                    {formatCurrency(row.currentTotal)}
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {formatCurrency(row.avgPrior3)}
                  </td>
                  <td className="py-2 text-right text-yellow-300 font-semibold">
                    {row.ratio.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">New Merchants This Month</h2>
          <span className="text-xs text-zinc-500">$20+ first seen</span>
        </div>
        {newMerchants.length === 0 ? (
          <p className="text-zinc-500 text-sm">No new merchants detected.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">First Seen</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Largest Charge</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {newMerchants.map((row, i) => (
                <tr key={`${row.merchant}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{formatDate(row.firstSeen)}</td>
                  <td className="py-2 font-medium text-zinc-200 max-w-[320px] truncate">{row.merchant}</td>
                  <td className="py-2 text-zinc-400">{row.category}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">
                    {formatCurrency(row.largestAmount)}
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="py-2 text-right text-indigo-300 font-semibold">{row.count}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Unusual Frequency Charges</h2>
          <span className="text-xs text-zinc-500">Month {currentMonthKey}</span>
        </div>
        {frequencySpikes.length === 0 ? (
          <p className="text-zinc-500 text-sm">No frequency spikes detected.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Current Count</th>
                <th className="pb-2 font-medium text-right">3-mo Avg</th>
                <th className="pb-2 font-medium text-right">Ratio</th>
                <th className="pb-2 font-medium text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {frequencySpikes.map((row, i) => (
                <tr key={`${row.merchant}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 font-medium text-zinc-200 max-w-[320px] truncate">{row.merchant}</td>
                  <td className="py-2 text-zinc-400">{row.category}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{row.currentCount}</td>
                  <td className="py-2 text-right font-mono text-zinc-400">{row.avgPrior3.toFixed(1)}</td>
                  <td className="py-2 text-right text-orange-300 font-semibold">{row.ratio.toFixed(2)}x</td>
                  <td className="py-2 text-right text-zinc-300 whitespace-nowrap">
                    {row.lastSeen ? formatDate(row.lastSeen) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
