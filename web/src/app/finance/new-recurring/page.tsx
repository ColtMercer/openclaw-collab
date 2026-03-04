import { getNewRecurringCharges } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

export default async function NewRecurringChargePage() {
  const charges = await getNewRecurringCharges();

  const totalMonthly = charges.reduce((sum, c) => sum + c.amount, 0);
  const totalAnnual = charges.reduce((sum, c) => sum + c.projectedAnnualCost, 0);
  const highCharges = charges.filter((c) => c.amount > 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Recurring Charge Alert</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Subscriptions detected in the last 60 days with no prior charge history
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
          {charges.length} new recurring charges found
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="New Monthly Spend" value={formatCurrency(totalMonthly)} subtitle="First-time charges" />
        <Card title="Projected Annual" value={formatCurrency(totalAnnual)} subtitle="If charges repeat" />
        <Card
          title="High Alerts"
          value={`${highCharges.length}`}
          subtitle=">$100/mo"
          className={highCharges.length > 0 ? "border-orange-500/30" : ""}
        />
      </div>

      {charges.length === 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-sm text-emerald-200">
          All clear — no new recurring charges detected in the last 60 days
        </div>
      ) : (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Detected Charges</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">First Charge</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Days Ago</th>
                <th className="pb-2 font-medium text-right">Projected Annual</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c, i) => {
                const isHigh = c.amount > 100;
                return (
                  <tr
                    key={`${c.merchant}-${i}`}
                    className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${
                      isHigh ? "bg-orange-500/10" : ""
                    }`}
                  >
                    <td className="py-2 font-medium text-zinc-200 max-w-[220px] truncate">{c.merchant}</td>
                    <td className="py-2 text-zinc-400 text-xs">{formatDate(c.firstSeenDate)}</td>
                    <td className={`py-2 text-right font-mono ${isHigh ? "text-orange-400 font-semibold" : "text-zinc-300"}`}>
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-2 text-right text-zinc-400 text-xs">{c.daysAgo}d</td>
                    <td className={`py-2 text-right font-mono ${isHigh ? "text-red-400 font-semibold" : "text-zinc-300"}`}>
                      {formatCurrency(c.projectedAnnualCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
