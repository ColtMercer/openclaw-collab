"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/finance/Card";
import { formatCurrency } from "@/lib/utils";
import type { CashFlowCalendarResult } from "@/lib/finance-queries";

type Props = {
  initialMonth: string;
};

type CalendarCell = {
  key: string;
  dayNumber: number | null;
  inMonth: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number) {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthGrid(month: string): CalendarCell[] {
  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const leading = firstDay.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - leading + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    cells.push({
      key: inMonth ? `${month}-${String(dayNumber).padStart(2, "0")}` : `empty-${i}`,
      dayNumber: inMonth ? dayNumber : null,
      inMonth,
    });
  }

  return cells;
}

function getCellClass(net: number, maxAbsNet: number) {
  if (net === 0 || maxAbsNet === 0) return "bg-zinc-900/40 border-zinc-800";
  const intensity = Math.max(0.18, Math.min(0.92, Math.abs(net) / maxAbsNet));
  if (net > 0) {
    return "border-emerald-500/30";
  }
  return "border-red-500/30";
}

export default function CashFlowCalendarClient({ initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [data, setData] = useState<CashFlowCalendarResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/finance/cash-flow-calendar?month=${selectedMonth}`)
      .then((res) => res.json())
      .then((json: CashFlowCalendarResult) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const dayMap = useMemo(() => new Map((data?.days || []).map((day) => [day.date, day])), [data]);
  const monthCells = useMemo(() => buildMonthGrid(selectedMonth), [selectedMonth]);
  const maxAbsNet = useMemo(
    () => Math.max(0, ...(data?.days || []).map((day) => Math.abs(day.net))),
    [data],
  );

  const monthOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { value, label };
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Calendar</h1>
          <p className="text-zinc-500 text-sm">Month view of net cash flow with paycheck detection and daily drilldown.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800" onClick={() => setSelectedMonth(initialMonth)}>
            Current Month
          </button>
          <button className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800" onClick={() => setSelectedMonth(shiftMonth(initialMonth, -1))}>
            Last Month
          </button>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Biggest spend day"
          value={data?.summary.biggestSpendDay ? formatCurrency(data.summary.biggestSpendDay.expenses) : "—"}
          subtitle={data?.summary.biggestSpendDay ? new Date(`${data.summary.biggestSpendDay.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No expense days"}
        />
        <Card
          title="Most frequent big-spend weekday"
          value={data?.summary.mostFrequentBigSpendDayOfWeek?.dayOfWeek || "—"}
          subtitle={data?.summary.mostFrequentBigSpendDayOfWeek ? `${data.summary.mostFrequentBigSpendDayOfWeek.count} high-spend days` : "Not enough data"}
        />
        <Card
          title="Avg daily burn"
          value={data ? formatCurrency(data.summary.avgDailyBurn) : "—"}
          subtitle="Average daily outflow this month"
        />
        <Card
          title="Monthly net"
          value={data ? formatCurrency(data.summary.totalNet) : "—"}
          subtitle={data ? `In ${formatCurrency(data.summary.totalIncome)} · Out ${formatCurrency(data.summary.totalExpenses)}` : ""}
          className={data?.summary.totalNet && data.summary.totalNet >= 0 ? "border-emerald-500/30" : "border-red-500/30"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500/60" /> Positive net</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-500/60" /> Negative net</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-yellow-400" /> Paycheck day</span>
        <span>Hover a day for totals</span>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#141420] p-4 md:p-5">
        <div className="mb-3 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthCells.map((cell) => {
            if (!cell.inMonth || cell.dayNumber == null) {
              return <div key={cell.key} className="min-h-24 rounded-xl border border-dashed border-zinc-800/70 bg-zinc-900/20" />;
            }

            const dayKey = `${selectedMonth}-${String(cell.dayNumber).padStart(2, "0")}`;
            const day = dayMap.get(dayKey);
            const net = day?.net || 0;
            const alpha = maxAbsNet === 0 ? 0 : Math.max(0.14, Math.min(0.95, Math.abs(net) / maxAbsNet));
            const backgroundColor = net > 0
              ? `rgba(16, 185, 129, ${alpha})`
              : net < 0
                ? `rgba(239, 68, 68, ${alpha})`
                : "rgba(24, 24, 27, 0.45)";

            return (
              <div
                key={cell.key}
                className={`group relative min-h-24 rounded-xl border p-2 transition-transform hover:-translate-y-0.5 ${getCellClass(net, maxAbsNet)}`}
                style={{ backgroundColor }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{cell.dayNumber}</span>
                  {day?.isPaycheckDay && <span className="rounded-full border border-yellow-400/80 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-300">PAY</span>}
                </div>
                <div className="mt-4 space-y-1 text-[11px] text-zinc-100/90">
                  <div>Net {formatCurrency(net)}</div>
                  <div className="text-zinc-200/75">{day?.transactionCount || 0} txns</div>
                </div>

                <div className="pointer-events-none absolute left-1/2 top-2 z-20 hidden w-56 -translate-x-1/2 rounded-lg border border-zinc-700 bg-[#09090b] p-3 text-xs text-zinc-200 shadow-2xl group-hover:block">
                  <div className="font-semibold">{new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                  <div className="mt-2 flex items-center justify-between gap-3"><span className="text-zinc-400">Total in</span><span className="text-emerald-400">{formatCurrency(day?.income || 0)}</span></div>
                  <div className="mt-1 flex items-center justify-between gap-3"><span className="text-zinc-400">Total out</span><span className="text-red-400">{formatCurrency(day?.expenses || 0)}</span></div>
                  <div className="mt-1 flex items-center justify-between gap-3"><span className="text-zinc-400">Net</span><span className={net >= 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(net)}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {loading && <p className="mt-4 text-sm text-zinc-500">Loading cash flow data…</p>}
      </div>
    </div>
  );
}
