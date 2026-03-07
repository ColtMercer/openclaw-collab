import { Card } from "@/components/finance/Card";
import { getNetWorthSnapshot } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default async function NetWorthPage() {
  const snapshot = await getNetWorthSnapshot();
  const netWorthTone = snapshot.netWorth >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#27272a] bg-[#141420] p-6 md:p-8">
        <div className="text-sm font-medium uppercase tracking-wide text-zinc-400">Net Worth Snapshot</div>
        <div className={`mt-3 text-4xl font-bold md:text-6xl ${netWorthTone}`}>
          {formatCurrency(snapshot.netWorth)}
        </div>
        <div className={`mt-3 text-sm ${snapshot.momDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {snapshot.momDelta >= 0 ? "+" : ""}{formatCurrency(snapshot.momDelta)} MoM
          <span className="ml-2 text-zinc-500">({formatPct(snapshot.momDeltaPct)})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Assets" value={formatCurrency(snapshot.assets)} subtitle="Positive account balances" className="border-emerald-500/30" />
        <Card title="Total Liabilities" value={formatCurrency(snapshot.liabilities)} subtitle="Negative account balances" className="border-red-500/30" />
        <Card title="MoM Change" value={`${snapshot.momDelta >= 0 ? "+" : ""}${formatCurrency(snapshot.momDelta)}`} subtitle={formatPct(snapshot.momDeltaPct)} className={snapshot.momDelta >= 0 ? "border-emerald-500/30" : "border-red-500/30"} />
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <h2 className="mb-4 text-lg font-semibold">Account Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="pb-3 font-medium">Account Name</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.accounts.map((account) => (
                <tr key={account.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-3 font-medium text-zinc-200">{account.name}</td>
                  <td className="py-3 capitalize text-zinc-400">{account.type}</td>
                  <td className={`py-3 text-right font-mono font-semibold ${account.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(account.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
