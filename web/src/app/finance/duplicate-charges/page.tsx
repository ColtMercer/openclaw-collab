import { getDuplicateCharges } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

type DuplicateChargeRow = {
  date: Date | string;
  description: string;
  amount: number;
  count: number;
  totalCharged: number;
};

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function badgeClass(count: number): string {
  if (count >= 3) return "bg-red-500/15 text-red-300 border border-red-500/30";
  return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30";
}

export default async function DuplicateChargesPage() {
  const rows = await getDuplicateCharges() as DuplicateChargeRow[];

  const totalGroups = rows.length;
  const totalDuplicateCharges = rows.reduce((sum, row) => sum + row.count, 0);
  const totalCharged = rows.reduce((sum, row) => sum + Math.abs(row.totalCharged || row.amount * row.count), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duplicate Charge Detector</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Finds same-day, same-amount duplicates over the last 90 days.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full text-sm font-semibold">
          {totalGroups} groups
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          title="Duplicate Groups"
          value={`${totalGroups}`}
          subtitle="Same-day duplicates"
          className={totalGroups > 0 ? "border-yellow-500/30" : ""}
        />
        <Card
          title="Duplicate Charges"
          value={`${totalDuplicateCharges}`}
          subtitle="Total charges in groups"
        />
        <Card
          title="Total Charged"
          value={formatCurrency(totalCharged)}
          subtitle="Absolute amount"
          className={totalCharged > 0 ? "border-red-500/30" : ""}
        />
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Duplicate Charge Groups</h2>
        {rows.length === 0 ? (
          <p className="text-zinc-500 text-sm">No duplicate charges found — you&apos;re in the clear!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Total Charged</th>
                <th className="pb-2 font-medium text-right">Dupes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.description}-${row.amount}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2 max-w-[320px] truncate font-medium text-zinc-200">
                    {row.description || "Unknown"}
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-300">
                    {formatCurrency(Math.abs(row.amount))}
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                    {formatCurrency(Math.abs(row.totalCharged || row.amount * row.count))}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass(row.count)}`}>
                      {row.count}x
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
