import { Card } from "@/components/finance/Card";
import { getSpendingForecast } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function FinanceForecastPage() {
  const forecast = await getSpendingForecast();
  const progressMax = Math.max(forecast.projectedTotal, forecast.lastMonthTotal, forecast.totalSoFar, 1);
  const actualWidth = Math.min((forecast.totalSoFar / progressMax) * 100, 100);
  const projectedWidth = Math.min((forecast.projectedTotal / progressMax) * 100, 100);
  const lastMonthWidth = Math.min((forecast.lastMonthTotal / progressMax) * 100, 100);
  const favorable = (forecast.projectedVsLastMonthPct || 0) <= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔮 Spending Forecast</h1>
        <p className="mt-1 text-sm text-zinc-400">Projected month-end spending for {forecast.month}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Total So Far" value={formatCurrency(forecast.totalSoFar)} subtitle={forecast.month} />
        <Card title="Projected Total" value={formatCurrency(forecast.projectedTotal)} subtitle="End-of-month estimate" className="border-amber-500/30" />
        <Card title="Progress" value={`${forecast.daysElapsed}/${forecast.daysInMonth}`} subtitle="Days elapsed this month" />
        <Card title="Projected vs Last Month" value={formatPercent(forecast.projectedVsLastMonthPct)} subtitle={forecast.projectedVsLastMonthPct === null ? "No prior month baseline" : favorable ? "Projected below last month" : "Projected above last month"} className={forecast.projectedVsLastMonthPct === null ? "" : favorable ? "border-emerald-500/30" : "border-red-500/30"} />
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Progress Bar</h2>
            <p className="text-sm text-zinc-500">Actual vs projected vs last month</p>
          </div>
          <div className="text-sm text-zinc-400">{forecast.daysInMonth - forecast.daysElapsed} days remaining</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Actual</span>
              <span className="font-mono text-zinc-100">{formatCurrency(forecast.totalSoFar)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${actualWidth}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Projected</span>
              <span className="font-mono text-zinc-100">{formatCurrency(forecast.projectedTotal)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${projectedWidth}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Last Month</span>
              <span className="font-mono text-zinc-100">{formatCurrency(forecast.lastMonthTotal)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${lastMonthWidth}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Top 5 Categories</h2>
            <p className="text-sm text-zinc-500">Average daily spend and projected month-end totals</p>
          </div>
        </div>

        {forecast.topCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">No spending categories found for the current month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Avg Daily</th>
                  <th className="pb-2 text-right font-medium">Projected</th>
                  <th className="pb-2 text-right font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {forecast.topCategories.map((category) => (
                  <tr key={category.category} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 font-medium text-zinc-200">{category.category}</td>
                    <td className="py-3 text-right font-mono text-zinc-300">{formatCurrency(category.avgDaily)}</td>
                    <td className="py-3 text-right font-mono font-semibold text-amber-400">{formatCurrency(category.projected)}</td>
                    <td className="py-3 text-right text-zinc-400">{category.percentOfTotal.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
