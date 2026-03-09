"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const sections = [
  {
    label: "Overview",
    links: [
      { href: "/finance", label: "Dashboard", icon: "📊" },
      { href: "/finance/net-worth", label: "Net Worth", icon: "🏦" },
      { href: "/finance/transactions", label: "Transactions", icon: "💳" },
      { href: "/finance/cashflow", label: "Cash Flow", icon: "📈" },
      { href: "/finance/income", label: "Income Breakdown", icon: "💰" },
    ],
  },
  {
    label: "Budgeting",
    links: [
      { href: "/finance/budget", label: "Budget", icon: "📋" },
      { href: "/finance/budget-history", label: "Budget History", icon: "📅" },
      { href: "/finance/recurring", label: "Recurring", icon: "🔄" },
      { href: "/finance/subscriptions", label: "Subscriptions", icon: "📦" },
      { href: "/finance/subscription-audit", label: "Subscription Audit", icon: "🔍" },
      { href: "/finance/subscription-escalations", label: "Sub Escalations", icon: "🚨" },
      { href: "/finance/new-recurring", label: "New Recurring", icon: "🚨" },
      { href: "/finance/forecast", label: "Forecast", icon: "🔮" },
    ],
  },
  {
    label: "Reports",
    links: [
      { href: "/finance/insights", label: "Insights", icon: "💡" },
      { href: "/finance/anomalies", label: "Anomalies", icon: "🚨" },
      { href: "/finance/velocity", label: "Spending Velocity", icon: "🔥" },
      { href: "/finance/heatmap", label: "Spending Heatmap", icon: "🗓️" },
      { href: "/finance/day-of-week", label: "Day of Week", icon: "📅" },
      { href: "/finance/monthly-trends", label: "Monthly Trends", icon: "📈" },
      { href: "/finance/cash-flow-calendar", label: "Cash Flow Calendar", icon: "💵" },
      { href: "/finance/merchants", label: "Merchant Spend", icon: "🏪" },
      { href: "/finance/restaurants", label: "Restaurants", icon: "🍽️" },
      { href: "/finance/delivery-vs-dinein", label: "Delivery vs Dining", icon: "🚗" },
      { href: "/finance/food-battle", label: "Food Battle", icon: "🍔" },
      { href: "/finance/peer-payments", label: "Peer Payments", icon: "💸" },
      { href: "/finance/convenience-stores", label: "Convenience Stores", icon: "🏪" },
      { href: "/finance/ai-spending", label: "AI Spend", icon: "🤖" },
      { href: "/finance/trading-infra", label: "Trading Infra", icon: "📡" },
      { href: "/finance/utilities", label: "Utilities", icon: "⚡" },
      { href: "/finance/duplicate-charges", label: "Duplicate Charges", icon: "🧾" },
      { href: "/finance/auto-repairs", label: "Auto Repairs", icon: "🔧" },
      { href: "/finance/category-auditor", label: "Category Auditor", icon: "📋" },
      { href: "/finance/api-spikes", label: "API Spikes", icon: "🔔" },
      { href: "/finance/insurance-events", label: "Insurance Events", icon: "🏥" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/finance/amazon-import", label: "Amazon Import", icon: "🛒" },
      { href: "/finance/rent-tracker", label: "Rent Tracker", icon: "🏠" },
      { href: "/finance/rules", label: "Rules", icon: "⚙️" },
    ],
  },
];

const allLinks = sections.flatMap((s) => s.links);

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const currentPage = allLinks.find((l) => l.href === pathname);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[#27272a] bg-[#0d0d14]/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
        <Link href="/" className="text-lg font-bold whitespace-nowrap">
          💰 Tiller Finance
        </Link>
        {currentPage && pathname !== "/" && (
          <span className="text-sm text-zinc-500 hidden sm:inline">
            / {currentPage.icon} {currentPage.label}
          </span>
        )}
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0d0d14] border-r border-[#27272a] transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
          <span className="text-lg font-bold">💰 Tiller Finance</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>
        <nav className="overflow-y-auto h-[calc(100%-56px)] py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {section.label}
              </p>
              {section.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    pathname === l.href
                      ? "bg-indigo-500/15 text-indigo-400 border-r-2 border-indigo-500"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="text-base">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
