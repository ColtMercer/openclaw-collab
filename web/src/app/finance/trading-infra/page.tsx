import { Card } from "@/components/finance/Card";
import { getTradingInfraCostCenter } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import TradingInfraClient from "./TradingInfraClient";

export const dynamic = "force-dynamic";

function formatMonth(month: string) {
  const [year, mon] = month.split("-");
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(date: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default async function TradingInfraPage() {
  const data = await getTradingInfraCostCenter();
  const { vendorSummaries, monthlyTotals, grandTotal, avgMonthly } = data;

  const latestMonth = monthlyTotals[monthlyTotals.length - 1];
  const latestMonthTotal = latestMonth?.total || 0;
  const alpacaDb = vendorSummaries.find((vendor) => vendor.name === "AlpacaDB");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📡 Trading Infrastructure Cost Center</h1>
        <p className="text-zinc-400 text-sm mt-1">
          API data feeds, market data subscriptions, and trading platform costs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="12-Month Spend"
          value={formatCurrency(grandTotal)}
          subtitle="Matched trading infra vendors"
          className="border-sky-500/30"
        />
        <Card
          title="Monthly Average"
          value={formatCurrency(avgMonthly)}
          subtitle="Average over the last 12 months"
        />
        <Card
          title="Vendor Count"
          value={`${vendorSummaries.length}`}
          subtitle="Distinct matched vendors"
        />
        <Card
          title="Latest Month"
          value={formatCurrency(latestMonthTotal)}
          subtitle={latestMonth ? formatMonth(latestMonth.month) : "No monthly data"}
        />
      </div>

      {alpacaDb && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 text-sm">
          <span className="text-sky-400 font-semibold">💡 AlpacaDB Watch: </span>
          <span className="text-zinc-300">
            AlpacaDB is active at roughly <strong className="text-sky-300">$1,089/mo</strong>. Tracked spend is
            <strong className="text-sky-300"> {formatCurrency(alpacaDb.monthlyAvg)}/mo average</strong> across the last 12 months,
            with <strong className="text-sky-300">{formatCurrency(alpacaDb.total)}</strong> total recorded.
          </span>
        </div>
      )}

      <TradingInfraClient monthlyTotals={monthlyTotals} />

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Vendor Breakdown</h2>
        {vendorSummaries.length === 0 ? (
          <p className="text-zinc-500 text-sm">No trading infrastructure charges detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
                <th className="pb-2 font-medium text-right">Monthly Avg</th>
                <th className="pb-2 font-medium">Last Charge</th>
                <th className="pb-2 font-medium text-right"># Charges</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendorSummaries.map((vendor) => {
                const active = daysSince(vendor.lastCharge) < 45;
                return (
                  <tr key={vendor.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 font-medium text-zinc-200">{vendor.name}</td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(vendor.total)}</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(vendor.monthlyAvg)}</td>
                    <td className="py-2 text-zinc-400 text-xs">{formatDate(vendor.lastCharge)}</td>
                    <td className="py-2 text-right text-zinc-400">{vendor.chargeCount}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                          active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
