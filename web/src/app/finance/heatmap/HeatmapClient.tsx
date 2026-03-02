"use client";
import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

interface DayTotal {
  _id: string; // "YYYY-MM-DD"
  total: number;
  count: number;
}

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

interface Props {
  dailyTotals: DayTotal[];
  transactions: Transaction[];
  year: number;
  month: number; // 0-indexed
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getCellColor(total: number, max: number): string {
  if (total === 0 || max === 0) return "bg-zinc-800/60";
  const pct = Math.sqrt(total / max); // sqrt for better distribution
  if (pct < 0.25) return "bg-indigo-900/70 border-indigo-700/30";
  if (pct < 0.5)  return "bg-indigo-600/60 border-indigo-500/40";
  if (pct < 0.75) return "bg-amber-600/60 border-amber-500/40";
  return "bg-red-600/70 border-red-500/50";
}

export default function HeatmapClient({ dailyTotals, transactions, year, month }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const totalMap = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const d of dailyTotals) m[d._id] = { total: d.total, count: d.count };
    return m;
  }, [dailyTotals]);

  const txByDay = useMemo(() => {
    const m: Record<string, Transaction[]> = {};
    for (const t of transactions) {
      const key = new Date(t.date).toISOString().slice(0, 10);
      if (!m[key]) m[key] = [];
      m[key].push(t);
    }
    return m;
  }, [transactions]);

  const maxDay = useMemo(() => Math.max(...dailyTotals.map((d) => d.total), 1), [dailyTotals]);
  const monthTotal = useMemo(() => dailyTotals.reduce((s, d) => s + d.total, 0), [dailyTotals]);
  const avgDaily = dailyTotals.length > 0 ? monthTotal / dailyTotals.length : 0;
  const peakDay = dailyTotals.reduce((a, b) => (b.total > a.total ? b : a), { _id: "", total: 0, count: 0 });

  // Build calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = month === 0 ? `?year=${year - 1}&month=11` : `?year=${year}&month=${month - 1}`;
  const nextMonth = month === 11 ? `?year=${year + 1}&month=0` : `?year=${year}&month=${month + 1}`;

  const selectedTx = selectedDay ? (txByDay[selectedDay] || []) : [];
  const selectedTotal = selectedDay ? (totalMap[selectedDay]?.total || 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗓️ Spending Heatmap</h1>
        <div className="flex items-center gap-3">
          <a href={prevMonth} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">← Prev</a>
          <span className="text-lg font-semibold">{MONTHS[month]} {year}</span>
          <a href={nextMonth} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">Next →</a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Month Total</div>
          <div className="text-xl font-bold text-red-400">{formatCurrency(monthTotal)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Avg Active Day</div>
          <div className="text-xl font-bold text-amber-400">{formatCurrency(avgDaily)}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Peak Day</div>
          <div className="text-xl font-bold text-red-500">{formatCurrency(peakDay.total)}</div>
          <div className="text-xs text-zinc-500">{peakDay._id ? new Date(peakDay._id + "T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}</div>
        </div>
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Active Days</div>
          <div className="text-xl font-bold text-indigo-400">{dailyTotals.length}</div>
          <div className="text-xs text-zinc-500">of {daysInMonth} days</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>Spend intensity:</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-zinc-800/60 border border-zinc-700 inline-block"/><span>None</span></span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-indigo-900/70 border border-indigo-700/30 inline-block"/><span>Low</span></span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-indigo-600/60 border border-indigo-500/40 inline-block"/><span>Med</span></span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-600/60 border border-amber-500/40 inline-block"/><span>High</span></span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-600/70 border border-red-500/50 inline-block"/><span>Peak</span></span>
      </div>

      {/* Calendar */}
      <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-zinc-500 pb-1">{d}</div>
          ))}
          <div className="text-center text-xs font-medium text-zinc-500 pb-1">Week</div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          const weekTotal = week.reduce((s, c) => s + (c.key ? (totalMap[c.key]?.total || 0) : 0), 0);
          return (
            <div key={wi} className="grid grid-cols-8 gap-1 mb-1">
              {week.map((cell, di) => {
                if (!cell.day || !cell.key) {
                  return <div key={di} className="rounded-lg h-14 bg-zinc-900/30" />;
                }
                const dayData = totalMap[cell.key];
                const isSelected = selectedDay === cell.key;
                const colorClass = getCellColor(dayData?.total || 0, maxDay);
                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDay(isSelected ? null : cell.key)}
                    className={`rounded-lg h-14 border flex flex-col items-center justify-center cursor-pointer transition-all ${colorClass} ${
                      isSelected ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#141420]" : "hover:ring-1 hover:ring-zinc-500"
                    }`}
                  >
                    <span className="text-sm font-semibold">{cell.day}</span>
                    {dayData && (
                      <span className="text-[10px] text-zinc-300 mt-0.5">{formatCurrency(dayData.total).replace("$","$")}</span>
                    )}
                  </button>
                );
              })}
              {/* Week total */}
              <div className="rounded-lg h-14 bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-[10px] text-zinc-500">total</span>
                <span className="text-xs font-semibold text-zinc-300">{formatCurrency(weekTotal)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day drill-down */}
      {selectedDay && (
        <div className="bg-[#141420] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <div className="text-right">
              <div className="text-xl font-bold text-red-400">{formatCurrency(selectedTotal)}</div>
              <div className="text-xs text-zinc-500">{selectedTx.length} transactions</div>
            </div>
          </div>
          {selectedTx.length === 0 ? (
            <p className="text-zinc-500 text-sm">No expense transactions this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedTx.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{t.description}</div>
                    <div className="text-xs text-zinc-500">{t.category || "Uncategorized"}</div>
                  </div>
                  <div className="text-sm font-semibold text-red-400">{formatCurrency(Math.abs(t.amount))}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
