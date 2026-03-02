import { getPeerPaymentData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

const PLATFORM_COLORS: Record<string, string> = {
  Zelle: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  Venmo: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "Apple Cash": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "Cash App": "text-green-400 bg-green-500/10 border-green-500/30",
  P2P: "text-zinc-400 bg-zinc-800/40 border-zinc-700",
};

function shortDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function PeerPaymentsPage() {
  const { byRecipient, byMonth, allTransactions, totalSent, totalReceived } = await getPeerPaymentData(12);

  const uniqueRecipients = byRecipient.length;
  const highValueRecipients = byRecipient.filter((r) => r.total >= 1000);

  const maxMonthly = Math.max(...(byMonth as { _id: string; total: number; count: number }[]).map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">💸 Peer Payments</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Zelle, Venmo, Apple Cash, and Cash App transactions — who you&apos;re sending money to.
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          title="Total Sent (P2P)"
          value={formatCurrency(totalSent)}
          subtitle="Last 12 months"
          className="border-red-500/20"
        />
        <Card
          title="Total Received (P2P)"
          value={formatCurrency(totalReceived)}
          subtitle="Last 12 months"
          className="border-emerald-500/20"
        />
        <Card
          title="Unique Recipients"
          value={`${uniqueRecipients}`}
          subtitle={`${highValueRecipients.length} over $1,000`}
          className="border-indigo-500/20"
        />
      </div>

      {/* High-value recipient callouts */}
      {highValueRecipients.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 font-semibold text-sm mb-2">💡 Large Transfer Recipients</p>
          <div className="space-y-1">
            {highValueRecipients.map((r, i) => (
              <p key={i} className="text-zinc-300 text-sm">
                <strong className="text-yellow-300">{r.name}</strong> — {formatCurrency(r.total)} total across {r.count} payment{r.count !== 1 ? "s" : ""}
                {" "}via <span className="text-zinc-400">{r.platform}</span>.
                {" "}Are these shared expenses, loans, or services?
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Monthly P2P spend bar chart */}
      {(byMonth as { _id: string; total: number; count: number }[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly P2P Outflow</h2>
          <div className="flex items-end gap-2 h-32">
            {(byMonth as { _id: string; total: number; count: number }[]).map((m, i) => {
              const height = Math.round((m.total / maxMonthly) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{formatCurrency(m.total)}</span>
                  <div
                    className="w-full bg-indigo-600/70 rounded-t"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{monthLabel(m._id)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top recipients table */}
      {byRecipient.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Recipients — Last 12 Months</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Recipient</th>
                <th className="pb-2 font-medium">Platform</th>
                <th className="pb-2 font-medium text-right">Total Sent</th>
                <th className="pb-2 font-medium text-right">Payments</th>
                <th className="pb-2 font-medium text-right">Avg/Payment</th>
                <th className="pb-2 font-medium">Last Sent</th>
              </tr>
            </thead>
            <tbody>
              {byRecipient.map((r, i) => {
                const platformClass = PLATFORM_COLORS[r.platform] || PLATFORM_COLORS.P2P;
                const isLarge = r.total >= 1000;
                return (
                  <tr key={i} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${isLarge ? "bg-yellow-500/5" : ""}`}>
                    <td className="py-2 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="py-2 font-medium text-zinc-200">
                      {r.name}
                      {isLarge && <span className="ml-2 text-yellow-400 text-xs">⚠️</span>}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${platformClass}`}>
                        {r.platform}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(r.total)}</td>
                    <td className="py-2 text-right text-zinc-400">{r.count}×</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(r.total / r.count)}</td>
                    <td className="py-2 text-zinc-400 text-xs">{shortDate(r.lastDate)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 font-semibold">
                <td></td>
                <td className="pt-3 text-zinc-300">{byRecipient.length} recipients</td>
                <td></td>
                <td className="pt-3 text-right font-mono">{formatCurrency(totalSent)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Recent P2P transactions */}
      {(allTransactions as { transaction_id?: string; date: string; description: string; amount: number }[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Recent P2P Transactions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Flow</th>
              </tr>
            </thead>
            <tbody>
              {(allTransactions as { transaction_id?: string; date: string; description: string; amount: number }[]).slice(0, 20).map((t, i) => {
                const isSent = t.amount < 0;
                return (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-zinc-400 text-xs">{shortDate(t.date)}</td>
                    <td className="py-2 text-zinc-200 max-w-xs truncate">{t.description}</td>
                    <td className={`py-2 text-right font-mono font-semibold ${isSent ? "text-red-400" : "text-emerald-400"}`}>
                      {isSent ? "-" : "+"}{formatCurrency(Math.abs(t.amount))}
                    </td>
                    <td className="py-2 text-right text-xs text-zinc-500">
                      {isSent ? "Sent" : "Received"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {byRecipient.length === 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-10 text-center">
          <p className="text-zinc-500">No Zelle, Venmo, Apple Cash, or Cash App transactions found in the last 12 months.</p>
        </div>
      )}
    </div>
  );
}
