import { getSubscriptionEscalations } from "@/lib/finance-queries";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/finance/Card";

export const dynamic = "force-dynamic";

type EscalationRow = {
  merchant: string;
  monthlyHistory: { month: string; amount: number }[];
  biggestJump: number;
  jumpFromMonth: string;
  jumpToMonth: string;
  currentMonthlyAmount: number;
};

function jumpBadge(jump: number): { label: string; className: string } {
  if (jump > 200) {
    return { label: "CRITICAL", className: "bg-red-500/20 text-red-400 border border-red-500/40" };
  }
  return { label: "WARNING", className: "bg-orange-500/20 text-orange-400 border border-orange-500/40" };
}

function formatJump(jump: number): string {
  if (jump >= 1000) return `${Math.round(jump)}%`;
  return `${jump.toFixed(1)}%`;
}

export default async function SubscriptionEscalationsPage() {
  const escalations = await getSubscriptionEscalations() as EscalationRow[];

  const totalCurrent = escalations.reduce((sum, e) => sum + (e.currentMonthlyAmount || 0), 0);
  const criticalCount = escalations.filter((e) => e.biggestJump > 200).length;
  const warningCount = escalations.length - criticalCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🚨 Subscription Tier Escalation Alert</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Detects subscription services that jumped by 50%+ in a single month over the last year.
        </p>
      </div>

      {escalations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Escalations" value={`${escalations.length}`} subtitle="50%+ month jumps" />
          <Card title="Critical" value={`${criticalCount}`} subtitle="200%+ jump" className="border-red-500/30" />
          <Card title="Warnings" value={`${warningCount}`} subtitle="50–200% jump" className="border-orange-500/30" />
          <Card title="Current Monthly" value={formatCurrency(totalCurrent)} subtitle="Active escalation spend" />
        </div>
      )}

      {escalations.length === 0 ? (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-6 text-sm text-zinc-400">
          No subscription tier escalations detected in the last 12 months.
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((item, i) => {
            const history = item.monthlyHistory.filter((m) => m.amount > 0);
            const { label, className } = jumpBadge(item.biggestJump);

            return (
              <div key={`${item.merchant}-${i}`} className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-zinc-100">{item.merchant}</h2>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}>
                        {label}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-zinc-300 font-mono flex flex-wrap items-center gap-1">
                      {history.length === 0 ? (
                        <span className="text-zinc-500">No charges in last 12 months</span>
                      ) : (
                        history.map((m, idx) => (
                          <span key={`${m.month}-${idx}`} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-zinc-500">→</span>}
                            <span>{formatCurrency(m.amount)}</span>
                          </span>
                        ))
                      )}
                    </div>
                    {history.length > 1 && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {history.map((m) => m.month).join(" → ")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 min-w-[140px]">
                      <div className="text-xs text-zinc-500">Biggest Jump</div>
                      <div className="text-base font-semibold text-zinc-100">+{formatJump(item.biggestJump)}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {item.jumpFromMonth || "—"} → {item.jumpToMonth || "—"}
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 min-w-[140px]">
                      <div className="text-xs text-zinc-500">Current Cost</div>
                      <div className="text-base font-semibold text-zinc-100">
                        {formatCurrency(item.currentMonthlyAmount)} / mo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
