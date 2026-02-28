import { getAISpendData, getAIVendorMonthlyBreakdown } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

// Normalize a raw description to a cleaner vendor name
function cleanVendorName(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("openai")) return "OpenAI";
  if (lower.includes("anthropic")) return "Anthropic";
  if (lower.includes("claude")) return "Claude.ai";
  if (lower.includes("chatgpt")) return "ChatGPT";
  if (lower.includes("midjourney")) return "Midjourney";
  if (lower.includes("github copilot") || (lower.includes("github") && lower.includes("copilot"))) return "GitHub Copilot";
  if (lower.includes("cursor")) return "Cursor";
  if (lower.includes("perplexity")) return "Perplexity";
  if (lower.includes("elevenlabs")) return "ElevenLabs";
  if (lower.includes("runway")) return "Runway";
  if (lower.includes("alpacadb") || lower.includes("alpaca")) return "AlpacaDB";
  if (lower.includes("replit")) return "Replit";
  if (lower.includes("groq")) return "Groq";
  if (lower.includes("replicate")) return "Replicate";
  if (lower.includes("cohere")) return "Cohere";
  if (lower.includes("suno")) return "Suno";
  if (lower.includes("heygen")) return "HeyGen";
  return raw;
}

const VENDOR_EMOJIS: Record<string, string> = {
  "OpenAI": "🟢",
  "Anthropic": "🟣",
  "Claude.ai": "🔵",
  "ChatGPT": "🟢",
  "Midjourney": "🎨",
  "GitHub Copilot": "🐙",
  "Cursor": "⚡",
  "Perplexity": "🔍",
  "ElevenLabs": "🎙️",
  "Runway": "🎬",
  "AlpacaDB": "📈",
  "Replit": "💻",
};

export default async function AISpendingPage() {
  const [{ byVendor, monthlyTotals }, vendorMonthly] = await Promise.all([
    getAISpendData(),
    getAIVendorMonthlyBreakdown(),
  ]);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Build vendor→month→total map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vmMap: Record<string, Record<string, number>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of vendorMonthly as any[]) {
    const vendor = cleanVendorName(row._id.description || "");
    if (!vmMap[vendor]) vmMap[vendor] = {};
    vmMap[vendor][row._id.month] = (vmMap[vendor][row._id.month] || 0) + row.total;
  }

  // MoM delta per vendor
  const momVendors = Object.entries(vmMap)
    .map(([vendor, months]) => {
      const cur = months[currentMonthKey] || 0;
      const prev = months[lastMonthKey] || 0;
      const delta = cur - prev;
      const deltaPct = prev > 0 ? (delta / prev) * 100 : cur > 0 ? 100 : 0;
      return { vendor, cur, prev, delta, deltaPct };
    })
    .filter((v) => v.cur > 0 || v.prev > 0)
    .sort((a, b) => b.cur - a.cur);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentMonthTotal = monthlyTotals.find((m: any) => m._id === currentMonthKey)?.total || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastMonthTotal = monthlyTotals.find((m: any) => m._id === lastMonthKey)?.total || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTimeTotal = byVendor.reduce((s: number, v: any) => s + v.total, 0);
  const activeVendors = byVendor.filter((v: any) => daysSince(v.lastSeen) <= 45).length;

  const maxMonthly = Math.max(...monthlyTotals.map((m: any) => m.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 AI Spend Tracker</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Track every dollar going to AI tools, APIs, and subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="This Month"
          value={formatCurrency(currentMonthTotal)}
          subtitle={currentMonthTotal > lastMonthTotal ? "▲ vs last month" : "▼ vs last month"}
          className={currentMonthTotal > lastMonthTotal ? "border-red-500/30" : "border-emerald-500/30"}
        />
        <Card title="Last Month" value={formatCurrency(lastMonthTotal)} subtitle="Prior month total" />
        <Card title="All-Time Total" value={formatCurrency(allTimeTotal)} subtitle="All AI vendors combined" />
        <Card title="Active Vendors" value={`${activeVendors}`} subtitle="Seen in last 45 days" />
      </div>

      {/* ROI callout */}
      {currentMonthTotal > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm">
          <span className="text-indigo-400 font-semibold">💡 AI Investment: </span>
          <span className="text-zinc-300">
            You&apos;re spending approximately{" "}
            <strong className="text-indigo-300">{formatCurrency(currentMonthTotal)}/mo</strong> on AI tools (
            <strong>{formatCurrency(currentMonthTotal * 12)}/yr</strong>). That&apos;s{" "}
            {allTimeTotal > 0 ? `${formatCurrency(allTimeTotal)} all-time` : "your AI stack"}.
            Make sure you&apos;re getting the ROI — kill anything you haven&apos;t used this month.
          </span>
        </div>
      )}

      {/* Monthly bar chart */}
      {monthlyTotals.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly AI Spend</h2>
          <div className="flex items-end gap-2 h-32">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {monthlyTotals.map((m: any, i: number) => {
              const height = Math.round((m.total / maxMonthly) * 100);
              const isCurrentMonth = m._id === currentMonthKey;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono">{formatCurrency(m.total)}</span>
                  <div
                    className={`w-full rounded-t ${isCurrentMonth ? "bg-indigo-500" : "bg-indigo-800/60"}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{m._id.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vendor breakdown table */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">By Vendor — All Time</h2>
        {byVendor.length === 0 ? (
          <p className="text-zinc-500 text-sm">No AI vendor transactions detected yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium w-8"></th>
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 font-medium text-right">Total Spent</th>
                <th className="pb-2 font-medium text-right"># Charges</th>
                <th className="pb-2 font-medium text-right">Avg/Charge</th>
                <th className="pb-2 font-medium">Last Seen</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {byVendor.map((v: any, i: number) => {
                const vendor = cleanVendorName(v._id || "");
                const emoji = VENDOR_EMOJIS[vendor] || "🔧";
                const days = daysSince(v.lastSeen);
                const isActive = days <= 45;
                return (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 text-base">{emoji}</td>
                    <td className="py-2 font-medium text-zinc-200">{vendor}</td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(v.total)}</td>
                    <td className="py-2 text-right text-zinc-400">{v.count}×</td>
                    <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(v.avgAmount)}</td>
                    <td className="py-2 text-zinc-400 text-xs">
                      {v.lastSeen
                        ? new Date(v.lastSeen).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className={`py-2 text-right text-xs font-semibold ${isActive ? "text-indigo-400" : "text-zinc-500"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 font-semibold">
                <td></td>
                <td className="pt-3 text-zinc-300">{byVendor.length} vendors</td>
                <td className="pt-3 text-right font-mono text-zinc-100">{formatCurrency(allTimeTotal)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Month-over-Month Changes */}
      {momVendors.length > 0 && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-1">📅 Month-over-Month Changes</h2>
          <p className="text-zinc-500 text-xs mb-4">
            Comparing {lastMonthKey} → {currentMonthKey}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Vendor</th>
                <th className="pb-2 font-medium text-right">Last Month</th>
                <th className="pb-2 font-medium text-right">This Month</th>
                <th className="pb-2 font-medium text-right">Change ($)</th>
                <th className="pb-2 font-medium text-right">Change (%)</th>
              </tr>
            </thead>
            <tbody>
              {momVendors.map((v, i) => {
                const isNew = v.prev === 0 && v.cur > 0;
                const isGone = v.cur === 0 && v.prev > 0;
                const isUp = v.deltaPct > 10;
                const isDown = v.deltaPct < -10;
                const emoji = VENDOR_EMOJIS[v.vendor] || "🔧";
                return (
                  <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-2 font-medium text-zinc-200">
                      <span className="mr-1.5">{emoji}</span>{v.vendor}
                    </td>
                    <td className="py-2 text-right font-mono text-zinc-400">
                      {v.prev > 0 ? formatCurrency(v.prev) : "—"}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-zinc-100">
                      {v.cur > 0 ? formatCurrency(v.cur) : "—"}
                    </td>
                    <td className={`py-2 text-right font-mono font-semibold ${isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-zinc-500"}`}>
                      {isNew ? "🆕 New" : isGone ? "✅ Gone" : `${v.delta > 0 ? "+" : ""}${formatCurrency(v.delta)}`}
                    </td>
                    <td className={`py-2 text-right text-sm font-semibold ${isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-zinc-500"}`}>
                      {isNew ? "—" : isGone ? "—" : `${v.deltaPct > 0 ? "+" : ""}${v.deltaPct.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Kill List — inactive AI tools */}
      {(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const killList = (byVendor as any[]).filter((v: any) => {
          const days = daysSince(v.lastSeen);
          return days >= 30 && days <= 120;
        });
        if (killList.length === 0) return null;
        return (
          <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-1 text-red-400">🔪 Kill List — Inactive AI Tools</h2>
            <p className="text-zinc-400 text-sm mb-4">
              These AI tools haven&apos;t been charged in 30–120 days but may still be on auto-renew.
              <strong className="text-red-300"> Cancel before the next billing cycle.</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {killList.map((v: any, i: number) => {
                const vendor = cleanVendorName(v._id || "");
                const emoji = VENDOR_EMOJIS[vendor] || "🔧";
                const days = daysSince(v.lastSeen);
                return (
                  <div key={i} className="bg-zinc-900/60 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 font-medium text-sm text-zinc-200">
                      <span>{emoji}</span>
                      <span className="truncate">{vendor}</span>
                    </div>
                    <div className="text-red-400 font-mono text-lg font-bold mt-1">
                      ~{formatCurrency(v.avgAmount)}/mo
                    </div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      Last charged: {days}d ago
                    </div>
                    <div className="text-zinc-600 text-xs mt-0.5">
                      {formatCurrency(v.total)} all-time ({v.count} charges)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
