import { Card } from "@/components/finance/Card";
import { getCategoryMismatches } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function confidenceClass(confidence: "high" | "medium"): string {
  return confidence === "high"
    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
    : "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30";
}

export default async function CategoryAuditorPage() {
  const rows = await getCategoryMismatches();
  const totalFlagged = rows.length;
  const totalDollarValue = rows.reduce((sum, row) => sum + row.amount, 0);
  const highConfidenceCount = rows.filter((row) => row.confidence === "high").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔍 Category Accuracy Auditor</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Transactions where the merchant name suggests a different category than recorded.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Total Flagged" value={`${totalFlagged}`} subtitle="Large transactions with mismatches" className={totalFlagged > 0 ? "border-amber-500/30" : ""} />
        <Card title="Total Dollar Value" value={formatCurrency(totalDollarValue)} subtitle="Absolute flagged spend" />
        <Card title="High Confidence" value={`${highConfidenceCount}`} subtitle="Strong merchant-category matches" className={highConfidenceCount > 0 ? "border-amber-500/30" : ""} />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Flagged Transactions</h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-500">
            No category mismatches flagged in the last 6 months.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Current Category</th>
                <th className="pb-2 font-medium">Suggested Category</th>
                <th className="pb-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.description}-${row.date}-${index}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2 max-w-[320px] truncate font-medium text-zinc-200">{row.description}</td>
                  <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(row.amount)}</td>
                  <td className="py-2 text-zinc-300">{row.currentCategory}</td>
                  <td className="py-2 text-indigo-300 font-medium">{row.suggestedCategory}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${confidenceClass(row.confidence)}`}>
                      {row.confidence}
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
