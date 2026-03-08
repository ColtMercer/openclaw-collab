"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/finance/Card";
import type { MerchantSpendResult } from "@/lib/finance-queries";
import { formatCurrency, formatDate } from "@/lib/utils";

type TimeFilter = "current" | "last" | "all";

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthValue(filter: TimeFilter) {
  if (filter === "all") return undefined;
  const now = new Date();
  if (filter === "last") {
    return toMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }
  return toMonthKey(now);
}

export default function MerchantSpendExplorerPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("current");
  const [category, setCategory] = useState("");
  const [data, setData] = useState<MerchantSpendResult | null>(null);
  const [loading, setLoading] = useState(true);

  const month = useMemo(() => getMonthValue(timeFilter), [timeFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (category) params.set("category", category);

    fetch(`/api/finance/merchants${params.toString() ? `?${params.toString()}` : ""}`)
      .then((res) => res.json())
      .then((json: MerchantSpendResult) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month, category]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Merchant Spend Explorer</h1>
        <p className="mt-1 text-sm text-zinc-500">See your biggest merchants by spend, frequency, and latest activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Total Merchants"
          value={data ? data.summary.totalMerchants.toLocaleString() : "—"}
          subtitle={data?.summary.topCategory ? `Top category: ${data.summary.topCategory}` : undefined}
        />
        <Card
          title="Total Spend"
          value={data ? formatCurrency(data.summary.totalSpend) : "—"}
          subtitle="Expenses only"
        />
        <Card
          title="Avg per Merchant"
          value={data ? formatCurrency(data.summary.avgPerMerchant) : "—"}
          subtitle="Across all matching merchants"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#27272a] bg-[#141420] p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Time Range</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "current", label: "Current Month" },
              { key: "last", label: "Last Month" },
              { key: "all", label: "All Time" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setTimeFilter(option.key as TimeFilter)}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  timeFilter === option.key
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">All categories</option>
            {(data?.categories || []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#27272a] bg-[#141420]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/50 text-left text-zinc-500">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Total Spend</th>
              <th className="px-4 py-3 font-medium text-right">Transactions</th>
              <th className="px-4 py-3 font-medium text-right">Avg</th>
              <th className="px-4 py-3 font-medium text-right">Last Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.merchants || []).map((merchant, index) => (
              <tr key={`${merchant.name}-${merchant.category}`} className="border-t border-zinc-800/80 hover:bg-zinc-900/30">
                <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-zinc-100">{merchant.name}</td>
                <td className="px-4 py-3 text-zinc-300">{merchant.category}</td>
                <td className="px-4 py-3 text-right font-medium text-red-300">{formatCurrency(merchant.totalSpend)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{merchant.count.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(merchant.avgTransaction)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{merchant.lastDate ? formatDate(merchant.lastDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && data && data.merchants.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No merchant spending found for this filter.</div>
        )}

        {loading && <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading merchant spend…</div>}
      </div>
    </div>
  );
}
