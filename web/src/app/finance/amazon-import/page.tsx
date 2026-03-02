"use client";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

type MatchResult = {
  orderId: string;
  orderDate: string;
  orderTotal: number;
  transaction_id?: string;
  matches?: string[];
  items: { name: string; qty?: number; price?: number }[];
};

type ImportResponse = {
  matched: MatchResult[];
  unmatched: MatchResult[];
  ambiguous: MatchResult[];
};

export default function AmazonImportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/finance/amazon/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json() as ImportResponse;
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Amazon Order Import</h1>
        <p className="text-zinc-500">Upload your Amazon order history CSV to match transactions.</p>
      </div>

      <label className="block border border-dashed border-zinc-700 rounded-xl p-6 bg-zinc-900/40 hover:border-indigo-400 transition-colors cursor-pointer">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
        />
        <div className="flex items-center gap-4">
          <span className="text-2xl">🧾</span>
          <div>
            <p className="text-zinc-200">Drop Amazon order history CSV here or click to upload.</p>
            <p className="text-xs text-zinc-500">We match within ±2 days and $0.50.</p>
          </div>
        </div>
      </label>

      {loading && <p className="text-xs text-zinc-400">Importing...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500">Matched</p>
              <p className="text-2xl font-semibold text-emerald-400">{result.matched.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500">Unmatched</p>
              <p className="text-2xl font-semibold text-amber-400">{result.unmatched.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500">Ambiguous</p>
              <p className="text-2xl font-semibold text-red-400">{result.ambiguous.length}</p>
            </div>
          </div>

          <div className="space-y-4">
            {result.matched.length > 0 && (
              <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Matched orders</h2>
                <div className="space-y-2 text-xs">
                  {result.matched.map((order) => (
                    <div key={`matched-${order.orderId}`} className="flex items-center justify-between">
                      <span className="text-zinc-200">
                        {order.orderId} · {formatDate(order.orderDate)}
                      </span>
                      <span className="text-zinc-300 font-mono">
                        {formatCurrency(order.orderTotal)} → {order.transaction_id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.unmatched.length > 0 && (
              <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Unmatched orders</h2>
                <div className="space-y-2 text-xs">
                  {result.unmatched.map((order) => (
                    <div key={`unmatched-${order.orderId}`} className="flex items-center justify-between">
                      <span className="text-zinc-200">
                        {order.orderId} · {formatDate(order.orderDate)}
                      </span>
                      <span className="text-zinc-300 font-mono">{formatCurrency(order.orderTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.ambiguous.length > 0 && (
              <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Ambiguous matches</h2>
                <div className="space-y-2 text-xs">
                  {result.ambiguous.map((order) => (
                    <div key={`ambiguous-${order.orderId}`} className="flex flex-col gap-1">
                      <span className="text-zinc-200">
                        {order.orderId} · {formatDate(order.orderDate)} · {formatCurrency(order.orderTotal)}
                      </span>
                      <span className="text-zinc-500">Matches: {order.matches?.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
