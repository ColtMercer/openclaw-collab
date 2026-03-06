"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#141420",
  border: "1px solid #27272a",
  borderRadius: 8,
  color: "#f4f4f5",
};

type MonthlyTotal = {
  month: string;
  total: number;
};

type MerchantRow = {
  _id: string;
  total: number;
  count: number;
};

type Transaction = {
  transaction_id?: string;
  date?: string | Date;
  description?: string;
  amount: number;
};

type SortKey = "date" | "merchant" | "amount";

type Props = {
  monthlyTotals: MonthlyTotal[];
  topMerchants: MerchantRow[];
  transactions: Transaction[];
  rangeLabel: string;
};

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function CategoryClient({
  monthlyTotals,
  topMerchants,
  transactions,
  rangeLabel,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const chartData = useMemo(
    () =>
      monthlyTotals.map((row) => ({
        month: formatMonthLabel(row.month),
        total: Number(row.total || 0),
      })),
    [monthlyTotals]
  );

  const sortedTransactions = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortKey === "date") {
        aVal = a.date ? new Date(a.date).getTime() : 0;
        bVal = b.date ? new Date(b.date).getTime() : 0;
      }

      if (sortKey === "merchant") {
        aVal = (a.description || "").toLowerCase().localeCompare((b.description || "").toLowerCase());
        bVal = 0;
      }

      if (sortKey === "amount") {
        aVal = Number(a.amount || 0);
        bVal = Number(b.amount || 0);
      }

      if (sortKey === "merchant") {
        return sortDir === "asc" ? aVal : -aVal;
      }

      if (aVal === bVal) return 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [transactions, sortDir, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "merchant" ? "asc" : "desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? "↑" : "↓";
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Month-over-Month Spend</h2>
            <p className="text-xs text-zinc-500">Last 12 months</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Spend"]} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Top Merchants</h2>
          <span className="text-xs text-zinc-500">Top 10 by total spend</span>
        </div>
        {topMerchants.length === 0 ? (
          <p className="text-sm text-zinc-500">No merchant data available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {topMerchants.map((row, i) => (
                <tr key={`${row._id}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 font-medium text-zinc-200 max-w-[360px] truncate">{row._id}</td>
                  <td className="py-2 text-right font-mono text-zinc-100">{formatCurrency(row.total)}</td>
                  <td className="py-2 text-right text-zinc-400">{row.count}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Transactions</h2>
            <p className="text-xs text-zinc-500">{rangeLabel}</p>
          </div>
        </div>
        {sortedTransactions.length === 0 ? (
          <p className="text-sm text-zinc-500">No transactions in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left border-b border-zinc-800">
                <th
                  className="pb-2 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort("date")}
                >
                  Date {sortIndicator("date")}
                </th>
                <th
                  className="pb-2 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort("merchant")}
                >
                  Merchant {sortIndicator("merchant")}
                </th>
                <th
                  className="pb-2 font-medium text-right cursor-pointer select-none"
                  onClick={() => toggleSort("amount")}
                >
                  Amount {sortIndicator("amount")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((tx, i) => (
                <tr key={tx.transaction_id || `${tx.description}-${i}`} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-2 text-zinc-300 whitespace-nowrap">{tx.date ? formatDate(tx.date) : "-"}</td>
                  <td className="py-2 font-medium text-zinc-200 max-w-[420px] truncate">{tx.description}</td>
                  <td className="py-2 text-right font-mono text-red-300">{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
