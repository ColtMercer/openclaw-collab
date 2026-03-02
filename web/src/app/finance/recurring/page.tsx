import { getRecurringPatterns, getRecurringChangeData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";
import { CommentButton } from "@/components/finance/CommentButton";

export const dynamic = "force-dynamic";

type RecurringPattern = {
  frequency?: string;
  is_income?: boolean;
  average_amount: number;
  sample_description?: string;
  description?: string;
  category?: string;
  months_seen?: number;
  last_seen?: string | Date | null;
};

type MonthlyActualRow = {
  _id: {
    description: string;
    month: string;
  };
  total: number;
};

export default async function RecurringPage() {
  const [patterns, { monthlyActuals }] = await Promise.all([
    getRecurringPatterns(),
    getRecurringChangeData(),
  ]);

  const monthly = (patterns as unknown as RecurringPattern[]).filter((p) => p.frequency === "monthly");
  const income = monthly.filter((p) => p.is_income);
  const expenses = monthly.filter((p) => !p.is_income);

  const totalIncome = income.reduce((s, p) => s + p.average_amount, 0);
  const totalExpenses = expenses.reduce((s, p) => s + Math.abs(p.average_amount), 0);

  // Build month-over-month deltas from actual transaction data
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prev2Date = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const prev2MonthKey = `${prev2Date.getFullYear()}-${String(prev2Date.getMonth() + 1).padStart(2, "0")}`;

  // Group monthly actuals by description → month → total
  const actualMap: Record<string, Record<string, number>> = {};
  for (const row of monthlyActuals as MonthlyActualRow[]) {
    const desc = row._id.description as string;
    const month = row._id.month as string;
    if (!actualMap[desc]) actualMap[desc] = {};
    actualMap[desc][month] = (actualMap[desc][month] || 0) + row.total;
  }

  // Match patterns to actuals (fuzzy — pattern description may partially match actual description)
  interface PatternChange {
    name: string;
    avgAmount: number;
    currentMonth: number;
    lastMonth: number;
    prev2Month: number;
    delta: number;
    deltaPct: number;
    isChanged: boolean;
    isIncrease: boolean;
    isDecrease: boolean;
    monthsActive: number;
    lastSeen: Date | null;
  }

  const patternChanges: PatternChange[] = expenses
    .filter((p) => Math.abs(p.average_amount) >= 1)
    .map((p) => {
      const name = (p.sample_description || p.description || "").trim();
      // Find matching actual descriptions (case-insensitive substring match)
      const lowerName = name.toLowerCase().slice(0, 20); // first 20 chars for matching
      let cur = 0, last = 0, prev2 = 0;
      for (const [desc, months] of Object.entries(actualMap)) {
        if (desc.toLowerCase().includes(lowerName) || lowerName.includes(desc.toLowerCase().slice(0, 15))) {
          cur += months[currentMonthKey] || 0;
          last += months[lastMonthKey] || 0;
          prev2 += months[prev2MonthKey] || 0;
        }
      }
      const compareBase = last || prev2 || Math.abs(p.average_amount);
      const delta = cur > 0 && last > 0 ? cur - last : 0;
      const deltaPct = compareBase > 0 && cur > 0 && last > 0 ? (delta / compareBase) * 100 : 0;
      const isChanged = Math.abs(deltaPct) > 15;
      return {
        name,
        avgAmount: Math.abs(p.average_amount),
        currentMonth: cur,
        lastMonth: last,
        prev2Month: prev2,
        delta,
        deltaPct,
        isChanged,
        isIncrease: isChanged && delta > 0,
        isDecrease: isChanged && delta < 0,
        monthsActive: p.months_seen || 0,
        lastSeen: p.last_seen ? new Date(p.last_seen) : null,
      };
    });

  const priceChanges = patternChanges.filter((p) => p.isChanged);
  const bigAlerts = patternChanges.filter((p) => p.isIncrease && p.delta > 50);

  const isActive = (p: RecurringPattern) => {
    if (!p.last_seen) return false;
    const last = new Date(p.last_seen);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 2);
    return last >= cutoff;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔄 Recurring Payments</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Recurring income &amp; expenses — with month-over-month price change detection.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Monthly Income" value={formatCurrency(totalIncome)} subtitle={`${income.length} sources`} />
        <Card title="Monthly Expenses" value={formatCurrency(totalExpenses)} subtitle={`${expenses.length} items`} />
        <Card title="Monthly Net" value={formatCurrency(totalIncome - totalExpenses)}
          className={totalIncome - totalExpenses >= 0 ? "border-emerald-500/30" : "border-red-500/30"} />
      </div>

      {/* Big Alert Banner */}
      {bigAlerts.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-semibold text-sm mb-2">🚨 Notable Charge Increases (&gt;$50 jump)</p>
          <div className="space-y-1">
            {bigAlerts.map((r, i) => (
              <p key={i} className="text-sm text-zinc-300">
                <strong>{r.name}</strong>: last month{" "}
                <span className="font-mono text-zinc-400">{formatCurrency(r.lastMonth)}</span>
                {" "}→ this month{" "}
                <span className="font-mono text-orange-400 font-semibold">{formatCurrency(r.currentMonth)}</span>
                {" "}(<span className="text-orange-400">+{formatCurrency(r.delta)}</span>)
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Price Changes Table */}
      {priceChanges.length > 0 && (
        <div className="bg-[#141420] border border-yellow-500/20 rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-1">💰 Price Changes Detected</h2>
          <p className="text-zinc-500 text-xs mb-4">
            Charges that changed &gt;15% between {lastMonthKey} and {currentMonthKey}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Usual Avg</th>
                <th className="pb-2 font-medium text-right">Last Month</th>
                <th className="pb-2 font-medium text-right">This Month</th>
                <th className="pb-2 font-medium text-right">Change</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {priceChanges.map((r, i) => (
                <tr key={i} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${r.isIncrease ? "bg-red-500/5" : "bg-emerald-500/5"}`}>
                  <td className="py-2 max-w-[200px] truncate font-medium text-zinc-200">{r.name}</td>
                  <td className="py-2 text-right font-mono text-zinc-400">{formatCurrency(r.avgAmount)}</td>
                  <td className="py-2 text-right font-mono text-zinc-300">
                    {r.lastMonth > 0 ? formatCurrency(r.lastMonth) : "—"}
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                    {r.currentMonth > 0 ? formatCurrency(r.currentMonth) : "—"}
                  </td>
                  <td className={`py-2 text-right font-mono font-semibold ${r.isIncrease ? "text-red-400" : "text-emerald-400"}`}>
                    {r.delta !== 0 ? `${r.delta > 0 ? "+" : ""}${formatCurrency(r.delta)}` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {r.isIncrease ? (
                      <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">🔴 Increased</span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">🟢 Decreased</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Recurring Charges — Change Detector Table */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-1">📊 All Recurring Expenses — Change Detector</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Month-over-month actual charge amounts. 🔴 Increased &gt;15% · 🟢 Decreased &gt;15% · ⚪ Stable · 🆕 New
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800">
              <th className="pb-2 font-medium">Merchant</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Avg/mo</th>
              <th className="pb-2 font-medium text-right">Last Month</th>
              <th className="pb-2 font-medium text-right">This Month</th>
              <th className="pb-2 font-medium text-right">Δ</th>
              <th className="pb-2 font-medium text-right">Months</th>
              <th className="pb-2 font-medium text-right">Status</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {patternChanges
              .sort((a, b) => b.avgAmount - a.avgAmount)
              .map((pc, i) => {
                const origPattern = expenses.find((p) =>
                  (p.sample_description || p.description || "").trim() === pc.name
                );
                const statusEmoji = !pc.currentMonth && !pc.lastMonth
                  ? "⚪"
                  : pc.isIncrease
                  ? "🔴"
                  : pc.isDecrease
                  ? "🟢"
                  : pc.currentMonth > 0 && pc.lastMonth === 0
                  ? "🆕"
                  : "⚪";
                return (
                  <tr key={i} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 group ${pc.isIncrease ? "bg-red-500/5" : ""}`}>
                    <td className="py-2 max-w-xs truncate">{pc.name}</td>
                    <td className="py-2">
                      {origPattern && (
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">
                          {origPattern.category}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-red-400">{formatCurrency(pc.avgAmount)}</td>
                    <td className="py-2 text-right font-mono text-zinc-400">
                      {pc.lastMonth > 0 ? formatCurrency(pc.lastMonth) : "—"}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                      {pc.currentMonth > 0 ? formatCurrency(pc.currentMonth) : "—"}
                    </td>
                    <td className={`py-2 text-right font-mono text-xs ${pc.isIncrease ? "text-red-400" : pc.isDecrease ? "text-emerald-400" : "text-zinc-600"}`}>
                      {pc.delta !== 0 ? `${pc.delta > 0 ? "+" : ""}${formatCurrency(pc.delta)}` : "—"}
                    </td>
                    <td className="py-2 text-right text-zinc-400">{pc.monthsActive}</td>
                    <td className="py-2 text-right text-base">{statusEmoji}</td>
                    <td className="py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {origPattern && (
                        <CommentButton
                          description={origPattern.sample_description}
                          amount={formatCurrency(Math.abs(origPattern.average_amount))}
                          category={origPattern.category}
                          page="recurring"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Recurring Income */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4 text-emerald-400">💰 Recurring Income</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800">
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Amount/mo</th>
              <th className="pb-2 font-medium text-right">Months</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {income.filter((p) => p.average_amount >= 1).map((p, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 group">
                <td className="py-2">{isActive(p) ? "✅" : "⚠️"}</td>
                <td className="py-2 max-w-sm truncate">{p.sample_description}</td>
                <td className="py-2"><span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{p.category}</span></td>
                <td className="py-2 text-right font-mono text-emerald-400">{formatCurrency(p.average_amount)}</td>
                <td className="py-2 text-right text-zinc-400">{p.months_seen}</td>
                <td className="py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CommentButton description={p.sample_description} amount={formatCurrency(p.average_amount)} category={p.category} page="recurring" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
