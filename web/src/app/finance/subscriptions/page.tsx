import { getSubscriptionAudit } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 999;
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function statusLabel(days: number): { label: string; color: string } {
  if (days <= 35) return { label: "Active", color: "text-emerald-400" };
  if (days <= 65) return { label: "Stale", color: "text-yellow-400" };
  return { label: "Zombie", color: "text-red-400" };
}

function statusDot(days: number): string {
  if (days <= 35) return "bg-emerald-500";
  if (days <= 65) return "bg-yellow-500";
  return "bg-red-500";
}

// Subscription-like keywords to look for
const SUB_KEYWORDS = [
  "netflix", "hulu", "disney", "spotify", "apple", "google", "adobe",
  "github", "openai", "anthropic", "chatgpt", "claude", "onlyfans",
  "butcherbox", "myheritage", "planet fitness", "la fitness", "anytime",
  "amazon", "alpacadb", "alpaca", "replit", "cursor", "perplexity",
  "youtube", "twitch", "paramount", "peacock", "max ", "hbo",
  "dropbox", "notion", "figma", "canva", "loom", "zoom", "slack",
  "intercom", "mailchimp", "hubspot", "shopify", "squarespace", "wix",
  "godaddy", "cloudflare", "digitalocean", "heroku", "vercel", "railway",
  "linode", "ahrefs", "semrush", "grammarly", "duolingo",
];

function isSubscriptionLike(desc: string): boolean {
  const d = desc.toLowerCase();
  return SUB_KEYWORDS.some((k) => d.includes(k));
}

// Estimate monthly equivalent based on frequency string
function monthlyEquiv(avgAmount: number, frequency: string): number {
  const f = (frequency || "").toLowerCase();
  if (f.includes("annual") || f.includes("yearly")) return Math.abs(avgAmount) / 12;
  if (f.includes("quarter")) return Math.abs(avgAmount) / 3;
  if (f.includes("week")) return Math.abs(avgAmount) * 4.33;
  return Math.abs(avgAmount); // default: monthly
}

export default async function SubscriptionsPage() {
  const { patterns, frequentMerchants } = await getSubscriptionAudit();

  // Build unified subscription list from recurring patterns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromPatterns = patterns.map((p: any) => ({
    name: p.sample_description || p.description || "Unknown",
    category: p.category || "—",
    avgAmount: Math.abs(p.average_amount),
    frequency: p.frequency || "monthly",
    lastSeen: p.last_seen ? new Date(p.last_seen) : null,
    monthlyEquiv: monthlyEquiv(p.average_amount, p.frequency || "monthly"),
    source: "recurring",
    count: p.months_seen || p.count || 0,
    isSubLike: true, // recurring patterns are already subscription-like
  }));

  // From frequent merchants (not already in patterns)
  const patternNames = new Set(fromPatterns.map((p) => p.name.toLowerCase()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromFrequent = frequentMerchants
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((m: any) => !patternNames.has((m._id || "").toLowerCase()) && isSubscriptionLike(m._id || ""))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => ({
      name: m._id || "Unknown",
      category: m.category || "—",
      avgAmount: m.avg,
      frequency: "monthly (est.)",
      lastSeen: m.lastSeen ? new Date(m.lastSeen) : null,
      monthlyEquiv: m.avg,
      source: "detected",
      count: m.count,
      isSubLike: true,
    }));

  const all = [...fromPatterns, ...fromFrequent].sort((a, b) => b.monthlyEquiv - a.monthlyEquiv);

  const activeItems = all.filter((s) => daysSince(s.lastSeen) <= 35);
  const staleItems = all.filter((s) => { const d = daysSince(s.lastSeen); return d > 35 && d <= 65; });
  const zombieItems = all.filter((s) => daysSince(s.lastSeen) > 65);

  const totalMonthly = all.reduce((sum, s) => sum + s.monthlyEquiv, 0);
  const activeMonthly = activeItems.reduce((sum, s) => sum + s.monthlyEquiv, 0);
  const zombieCost = zombieItems.reduce((sum, s) => sum + s.monthlyEquiv, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📦 Subscription Audit</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Detected {all.length} recurring charges — {activeItems.length} active, {staleItems.length} stale, {zombieItems.length} zombie
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Monthly Stack"
          value={formatCurrency(totalMonthly)}
          subtitle={`${formatCurrency(totalMonthly * 12)}/year`}
        />
        <Card
          title="Active Subs"
          value={formatCurrency(activeMonthly)}
          subtitle={`${activeItems.length} services`}
          className="border-emerald-500/30"
        />
        <Card
          title="Zombie Spend"
          value={formatCurrency(zombieCost)}
          subtitle={`${zombieItems.length} possibly forgotten`}
          className={zombieCost > 0 ? "border-red-500/30" : ""}
        />
        <Card
          title="Annual Burn"
          value={formatCurrency(totalMonthly * 12)}
          subtitle="If nothing changes"
        />
      </div>

      {zombieCost > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
          <span className="text-red-400 font-semibold">⚠️ Possible savings: </span>
          <span className="text-zinc-300">
            {zombieItems.length} subscriptions haven&apos;t been seen in 60+ days but may still be charging.
            That&apos;s up to <strong className="text-red-400">{formatCurrency(zombieCost)}/mo</strong> (
            {formatCurrency(zombieCost * 12)}/yr) in potential zombie spend.
          </span>
        </div>
      )}

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">All Subscriptions — by Monthly Cost</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left border-b border-zinc-800">
              <th className="pb-2 pr-3 font-medium w-3"></th>
              <th className="pb-2 font-medium">Merchant</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Avg Charge</th>
              <th className="pb-2 font-medium text-right">Mo. Equiv</th>
              <th className="pb-2 font-medium">Frequency</th>
              <th className="pb-2 font-medium">Last Seen</th>
              <th className="pb-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map((s, i) => {
              const days = daysSince(s.lastSeen);
              const { label, color } = statusLabel(days);
              const dot = statusDot(days);
              return (
                <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 pr-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
                  </td>
                  <td className="py-2 max-w-[220px] truncate font-medium text-zinc-200">{s.name}</td>
                  <td className="py-2">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{s.category}</span>
                  </td>
                  <td className="py-2 text-right font-mono text-zinc-300">{formatCurrency(s.avgAmount)}</td>
                  <td className="py-2 text-right font-mono font-semibold text-zinc-100">{formatCurrency(s.monthlyEquiv)}</td>
                  <td className="py-2 text-zinc-400 text-xs">{s.frequency}</td>
                  <td className="py-2 text-zinc-400 text-xs">
                    {s.lastSeen
                      ? `${s.lastSeen.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${days}d ago)`
                      : "—"}
                  </td>
                  <td className={`py-2 text-right text-xs font-semibold ${color}`}>{label}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700 font-semibold">
              <td></td>
              <td className="pt-3 text-zinc-300">{all.length} subscriptions</td>
              <td></td>
              <td></td>
              <td className="pt-3 text-right text-zinc-100 font-mono">{formatCurrency(totalMonthly)}/mo</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {zombieItems.length > 0 && (
        <div className="bg-[#141420] border border-red-500/20 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 text-red-400">🧟 Zombie Subscriptions — Consider Canceling</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zombieItems.map((s, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                <div className="font-medium text-sm truncate text-zinc-200">{s.name}</div>
                <div className="text-red-400 font-mono text-lg font-bold mt-1">{formatCurrency(s.monthlyEquiv)}/mo</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  Last seen: {s.lastSeen ? `${daysSince(s.lastSeen)}d ago` : "unknown"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
