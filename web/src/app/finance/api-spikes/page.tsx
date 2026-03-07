import { Card } from "@/components/finance/Card";
import { getAPIUsageSpikeData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function APIUsageSpikesPage() {
  const data = await getAPIUsageSpikeData();
  const spikeAlerts = data.vendors.filter((vendor) => vendor.isSpike).length;
  const activeThisMonth = data.vendors.filter((vendor) => vendor.currentMonth.count > 0).length;
  const latestMonthLabel = data.latestMonth ? formatMonth(data.latestMonth) : "Latest month";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚡ API Usage Spike Detector</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Detects when API billing shifts from subscription to usage-based spikes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total API Vendors" value={`${data.vendors.length}`} subtitle="Tracked vendors with charges" />
        <Card title="Active This Month" value={`${activeThisMonth}`} subtitle="Vendors with current-month charges" />
        <Card title="Spike Alerts" value={`${spikeAlerts}`} subtitle="Current month anomalies" className={spikeAlerts > 0 ? "border-red-500/30" : ""} />
        <Card title="Latest Month" value={latestMonthLabel} subtitle="Current comparison window" />
      </div>

      <Card title="Total API Spend" value={formatCurrency(data.totalApiSpend)} subtitle="All detected API charges" />

      {spikeAlerts > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {spikeAlerts} vendor(s) showing unusual API usage this month.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data.vendors.map((vendor) => (
          <div key={vendor.name} className={`bg-[#141420] border rounded-xl p-5 ${vendor.isSpike ? "border-red-500/30" : "border-[#27272a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{vendor.name}</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Current month: {formatCurrency(vendor.currentMonth.total)} across {vendor.currentMonth.count} charge(s)
                </p>
              </div>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${vendor.isSpike ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"}`}>
                {vendor.isSpike ? "Spike" : "Normal"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
                <p className="text-zinc-500">Avg Monthly</p>
                <p className="font-semibold mt-1">{formatCurrency(vendor.avgMonthly)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
                <p className="text-zinc-500">Trailing 3M Count</p>
                <p className="font-semibold mt-1">{vendor.trailingAvgCount.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
                <p className="text-zinc-500">Trailing 3M Spend</p>
                <p className="font-semibold mt-1">{formatCurrency(vendor.trailingAvgTotal)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
                <p className="text-zinc-500">Avg Count</p>
                <p className="font-semibold mt-1">{vendor.avgCount.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
                <p className="text-zinc-500">vs Avg</p>
                <p className={`font-semibold mt-1 ${vendor.pctAboveAvg > 0 ? "text-red-300" : "text-zinc-200"}`}>
                  {vendor.pctAboveAvg >= 0 ? "+" : ""}{vendor.pctAboveAvg.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
        {data.monthlyBreakdown.length === 0 ? (
          <p className="text-zinc-500 text-sm">No API vendor charges detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 font-medium text-right"># Charges</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium text-right">vs Avg</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyBreakdown.map((row) => {
                const vendor = data.vendors.find((item) => item.name === row.vendor);
                const avg = vendor?.avgMonthly || 0;
                const pct = avg > 0 ? ((row.total - avg) / avg) * 100 : 0;
                const isSpikeMonth = vendor?.currentMonth.month === row.month && vendor?.isSpike;
                return (
                  <tr key={`${row.month}-${row.vendor}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 whitespace-nowrap text-zinc-300">{formatMonth(row.month)}</td>
                    <td className="py-2 font-medium text-zinc-200">{row.vendor}</td>
                    <td className="py-2 text-right font-mono text-zinc-100">{row.count}</td>
                    <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(row.total)}</td>
                    <td className={`py-2 text-right font-mono ${pct > 0 ? "text-red-300" : "text-zinc-300"}`}>
                      {avg > 0 ? `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${isSpikeMonth ? "bg-red-500/15 text-red-300 border border-red-500/30" : "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30"}`}>
                        {isSpikeMonth ? "Spike" : "Normal"}
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
