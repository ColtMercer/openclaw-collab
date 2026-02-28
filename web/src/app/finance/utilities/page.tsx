import { getUtilityBillData } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

// Normalize raw description → clean utility name
function cleanUtilityName(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes("4change")) return "4Change Energy";
  if (l.includes("at&t") || (l.includes("att") && !l.includes("battle"))) return "AT&T";
  if (l.includes("xfinity") || l.includes("comcast")) return "Xfinity / Comcast";
  if (l.includes("t-mobile") || l.includes("tmobile")) return "T-Mobile";
  if (l.includes("verizon")) return "Verizon";
  if (l.includes("spectrum")) return "Spectrum";
  if (l.includes("google fiber")) return "Google Fiber";
  if (l.includes("cps energy")) return "CPS Energy";
  if (l.includes("txu")) return "TXU Energy";
  if (l.includes("reliant")) return "Reliant Energy";
  if (l.includes("oncor")) return "Oncor";
  if (l.includes("entergy")) return "Entergy";
  if (l.includes("southwest gas")) return "Southwest Gas";
  if (l.includes("atmos")) return "Atmos Energy";
  if (l.includes("republic services")) return "Republic Services";
  if (l.includes("centerpoint")) return "CenterPoint Energy";
  if (l.includes("duke")) return "Duke Energy";
  if (l.includes("dominion")) return "Dominion Energy";
  if (l.includes("pg&e") || l.includes("pge")) return "PG&E";
  if (l.includes("con edison")) return "Con Edison";
  if (l.includes("puget")) return "Puget Sound Energy";
  return raw;
}

const UTILITY_EMOJIS: Record<string, string> = {
  "4Change Energy": "⚡",
  "AT&T": "📱",
  "Xfinity / Comcast": "📡",
  "T-Mobile": "📱",
  "Verizon": "📱",
  "Spectrum": "📡",
  "Google Fiber": "🌐",
  "CPS Energy": "💡",
  "TXU Energy": "⚡",
  "Reliant Energy": "⚡",
  "Oncor": "⚡",
  "Entergy": "⚡",
  "Southwest Gas": "🔥",
  "Atmos Energy": "🔥",
  "Republic Services": "♻️",
  "CenterPoint Energy": "⚡",
  "Duke Energy": "⚡",
  "Dominion Energy": "⚡",
  "PG&E": "⚡",
  "Con Edison": "⚡",
  "Puget Sound Energy": "⚡",
};

interface UtilityRow {
  name: string;
  rawDesc: string;
  emoji: string;
  monthlyData: Record<string, number>;
  threeMonthAvg: number;
  currentMonth: number;
  lastMonth: number;
  delta: number;
  deltaPct: number;
  isAnomaly: boolean;
  isSpike: boolean;
  isDrop: boolean;
}

export default async function UtilitiesPage() {
  const { rawByMonth, summary } = await getUtilityBillData();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Build months list (last 6, oldest first)
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // The 3-month avg window = months[2], months[3], months[4] (the 3 months before current)
  const avgMonths = months.slice(2, 5);

  // Group raw data by normalized utility name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utilityMap: Map<string, { rawDesc: string; monthlyData: Record<string, number> }> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of rawByMonth as any[]) {
    const name = cleanUtilityName(row._id.description || "");
    const month = row._id.month as string;
    if (!utilityMap.has(name)) {
      utilityMap.set(name, { rawDesc: row._id.description, monthlyData: {} });
    }
    const entry = utilityMap.get(name)!;
    entry.monthlyData[month] = (entry.monthlyData[month] || 0) + row.total;
  }

  // Compute metrics for each utility
  const rows: UtilityRow[] = Array.from(utilityMap.entries()).map(([name, { rawDesc, monthlyData }]) => {
    const avgValues = avgMonths.map((m) => monthlyData[m] || 0).filter((v) => v > 0);
    const threeMonthAvg = avgValues.length > 0 ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 0;
    const currentMonth = monthlyData[currentMonthKey] || 0;
    const lastMonth = monthlyData[lastMonthKey] || 0;
    const compareBase = threeMonthAvg > 0 ? threeMonthAvg : lastMonth;
    const delta = currentMonth - compareBase;
    const deltaPct = compareBase > 0 ? (delta / compareBase) * 100 : 0;
    const isSpike = deltaPct > 25;
    const isDrop = deltaPct < -25;
    const isAnomaly = isSpike || isDrop;
    const emoji = UTILITY_EMOJIS[name] || "🔌";
    return { name, rawDesc, emoji, monthlyData, threeMonthAvg, currentMonth, lastMonth, delta, deltaPct, isAnomaly, isSpike, isDrop };
  }).sort((a, b) => b.currentMonth - a.currentMonth);

  const anomalies = rows.filter((r) => r.isAnomaly);
  const spikes = rows.filter((r) => r.isSpike);

  // Summary totals
  const totalCurrentMonth = rows.reduce((s, r) => s + r.currentMonth, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalThreeMonthAvg = rows.reduce((s, r) => s + r.threeMonthAvg, 0);
  const totalDelta = totalCurrentMonth - totalThreeMonthAvg;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maxSummaryTotal = Math.max(...(summary as any[]).map((m: any) => m.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">⚡ Utility Bill Anomaly Alerter</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Flags energy, telecom, and utility bills that spike or drop vs. your 3-month rolling average.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="This Month"
          value={formatCurrency(totalCurrentMonth)}
          subtitle={totalCurrentMonth > totalThreeMonthAvg ? "▲ above 3-mo avg" : "▼ below 3-mo avg"}
          className={totalCurrentMonth > totalThreeMonthAvg ? "border-red-500/30" : "border-emerald-500/30"}
        />
        <Card
          title="3-Month Avg"
          value={formatCurrency(totalThreeMonthAvg)}
          subtitle="Rolling baseline"
        />
        <Card
          title="Delta vs Avg"
          value={`${totalDelta > 0 ? "+" : ""}${formatCurrency(totalDelta)}`}
          subtitle={totalDelta > 0 ? "Over budget" : "Under budget"}
          className={totalDelta > 0 ? "border-red-500/30" : "border-emerald-500/30"}
        />
        <Card
          title="Anomalies"
          value={`${anomalies.length}`}
          subtitle={`${spikes.length} spike${spikes.length !== 1 ? "s" : ""}, ${anomalies.length - spikes.length} drop${anomalies.length - spikes.length !== 1 ? "s" : ""}`}
          className={anomalies.length > 0 ? "border-yellow-500/30" : ""}
        />
      </div>

      {/* Spike Alert Banner */}
      {spikes.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-semibold text-sm mb-2">⚠️ Bill Spikes Detected</p>
          <div className="space-y-1">
            {spikes.map((r, i) => (
              <p key={i} className="text-sm text-zinc-300">
                {r.emoji} <strong>{r.name}</strong>: this month{" "}
                <span className="text-red-400 font-mono font-semibold">{formatCurrency(r.currentMonth)}</span>
                {" "}vs. avg{" "}
                <span className="font-mono text-zinc-400">{formatCurrency(r.threeMonthAvg)}</span>
                {" "}— <span className="text-red-400 font-semibold">+{r.deltaPct.toFixed(0)}% over baseline</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Monthly trend bar chart */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(summary as any[]).length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly Utility Spend</h2>
          <div className="flex items-end gap-2 h-28">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(summary as any[]).map((m: any, i: number) => {
              const height = Math.round((m.total / maxSummaryTotal) * 100);
              const isCurrent = m._id === currentMonthKey;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{formatCurrency(m.total)}</span>
                  <div
                    className={`w-full rounded-t ${isCurrent ? "bg-yellow-500" : "bg-yellow-900/60"}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{m._id.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomaly Alert Table */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Utility Spike Report — {currentMonthKey}</h2>
        {rows.length === 0 ? (
          <p className="text-zinc-500 text-sm">No utility transactions found for the past 6 months.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 w-8"></th>
                <th className="pb-2 font-medium">Utility</th>
                <th className="pb-2 font-medium text-right">3-Mo Avg</th>
                <th className="pb-2 font-medium text-right">Last Month</th>
                <th className="pb-2 font-medium text-right">This Month</th>
                <th className="pb-2 font-medium text-right">Change</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-b border-zinc-800/40 hover:bg-zinc-800/20 ${r.isSpike ? "bg-red-500/5" : ""}`}>
                  <td className="py-2 text-base">{r.emoji}</td>
                  <td className="py-2 font-medium text-zinc-200">{r.name}</td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {r.threeMonthAvg > 0 ? formatCurrency(r.threeMonthAvg) : "—"}
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-400">
                    {r.lastMonth > 0 ? formatCurrency(r.lastMonth) : "—"}
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                    {r.currentMonth > 0 ? formatCurrency(r.currentMonth) : "—"}
                  </td>
                  <td className={`py-2 text-right font-mono font-semibold ${r.isSpike ? "text-red-400" : r.isDrop ? "text-emerald-400" : "text-zinc-500"}`}>
                    {r.currentMonth === 0 ? "—" : r.threeMonthAvg === 0 ? "🆕 New" : `${r.delta > 0 ? "+" : ""}${r.deltaPct.toFixed(0)}%`}
                  </td>
                  <td className="py-2 text-right">
                    {r.isSpike ? (
                      <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">🔴 Spike</span>
                    ) : r.isDrop ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">🔵 Lower</span>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">🟢 Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Per-Utility Monthly Mini Charts */}
      {rows.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">6-Month History by Utility</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r, ri) => {
              const values = months.map((m) => r.monthlyData[m] || 0);
              const maxVal = Math.max(...values, 1);
              return (
                <div key={ri} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {r.emoji} {r.name}
                    </span>
                    {r.isSpike && <span className="text-xs text-red-400 font-semibold">🔴 Spike</span>}
                    {r.isDrop && <span className="text-xs text-emerald-400 font-semibold">🔵 Low</span>}
                  </div>
                  <div className="flex items-end gap-1 h-12">
                    {values.map((val, vi) => {
                      const height = Math.round((val / maxVal) * 100);
                      const isCurrent = months[vi] === currentMonthKey;
                      return (
                        <div key={vi} className="flex-1 flex flex-col items-center gap-0.5">
                          <div
                            className={`w-full rounded-sm ${
                              isCurrent
                                ? r.isSpike ? "bg-red-500" : r.isDrop ? "bg-emerald-500" : "bg-yellow-500"
                                : "bg-zinc-700"
                            }`}
                            style={{ height: `${Math.max(height, val > 0 ? 8 : 0)}%` }}
                          />
                          <span className="text-[8px] text-zinc-600">{months[vi].slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    This mo: <span className="text-zinc-300 font-mono">{r.currentMonth > 0 ? formatCurrency(r.currentMonth) : "—"}</span>
                    {r.threeMonthAvg > 0 && (
                      <> · Avg: <span className="font-mono">{formatCurrency(r.threeMonthAvg)}</span></>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
