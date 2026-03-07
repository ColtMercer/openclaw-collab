import { Card } from "@/components/finance/Card";
import { getRentTrackerData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { RentTrackerChart } from "./RentTrackerChart";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function RentTrackerPage() {
  const data = await getRentTrackerData();
  const gapCount = data.gaps.length;
  const rentIncreasePresent = data.monthlyHistory.some((row) => row.month === "2025-09" && row.amount === 2500)
    && data.monthlyHistory.some((row) => row.month === "2025-08" && row.amount === 2400);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏠 Rent Tracker</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Monthly Zelle rent payments — Lavaca Trail.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Paid" value={formatCurrency(data.totalPaid)} subtitle="All time" />
        <Card title="Monthly Rate" value={formatCurrency(data.currentMonthlyRate)} subtitle="Current observed rent" className="border-indigo-500/30" />
        <Card title="Payment Count" value={`${data.paymentCount}`} subtitle="Matched rent transactions" />
        <Card title="Gap Months" value={`${gapCount}`} subtitle="Months in range with no payment" className={gapCount > 0 ? "border-amber-500/30" : ""} />
      </div>

      {rentIncreasePresent && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-zinc-300">
          <span className="font-semibold text-indigo-300">📈 Rent increase detected:</span>{" "}
          Monthly rent moved from <span className="font-semibold">{formatCurrency(2400)}</span> to <span className="font-semibold">{formatCurrency(2500)}</span> in <span className="font-semibold">Sep 2025</span>.
        </div>
      )}

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Monthly Rent Trend</h2>
          <span className="text-xs text-zinc-500">Line + bars show paid months and gaps</span>
        </div>
        {data.monthlyHistory.length === 0 ? (
          <p className="text-zinc-500 text-sm">No rent transactions matched yet.</p>
        ) : (
          <RentTrackerChart data={data.monthlyHistory} />
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        {data.historyWithGaps.length === 0 ? (
          <p className="text-zinc-500 text-sm">No rent payment history available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.historyWithGaps.map((row) => (
                <tr key={row.month} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${row.month === "2025-09" && row.amount === 2500 ? "bg-indigo-500/5" : ""}`}>
                  <td className="py-2 font-medium text-zinc-200 whitespace-nowrap">{formatMonth(row.month)}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{row.amount > 0 ? formatCurrency(row.amount) : "—"}</td>
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2 text-zinc-300 max-w-[280px] truncate">{row.description || "—"}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === "Paid" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-red-500/15 text-red-300 border border-red-500/30"}`}>
                      {row.status}
                    </span>
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
