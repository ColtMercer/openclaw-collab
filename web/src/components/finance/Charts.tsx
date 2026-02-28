"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { getColor, formatCurrency } from "@/lib/utils";

const tooltipStyle = { backgroundColor: "#1a1a2e", border: "1px solid #27272a", borderRadius: 8 };

export function MonthlyBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="_id" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data }: { data: any[] }) {
  const top = data.slice(0, 8);
  const other = data.slice(8);
  const items = other.length
    ? [...top, { _id: "Other", total: other.reduce((s: number, d: any) => s + d.total, 0) }]
    : top;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={items} dataKey="total" nameKey="_id" cx="50%" cy="50%"
          innerRadius={60} outerRadius={110} paddingAngle={2} stroke="none">
          {items.map((_, i) => <Cell key={i} fill={getColor(i)} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NetWorthLine({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
        <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DowChart({ data }: { data: any[] }) {
  const days = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mapped = data.map((d: any) => ({ ...d, day: days[d._id] || d._id, avg: d.count ? d.total / d.count : 0 }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={mapped}>
        <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v.toFixed(0)}`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
        <Bar dataKey="avg" name="Avg Spend" fill="#8b5cf6" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
