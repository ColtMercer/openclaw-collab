"use client";
import { useState } from "react";

interface CommentButtonProps {
  transactionId?: string;
  description?: string;
  amount?: string;
  category?: string;
  date?: string;
  page: string;
}

export function CommentButton({ transactionId, description, amount, category, date, page }: CommentButtonProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/finance/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, description, amount, category, date, comment, page }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => { setSent(false); setOpen(false); setComment(""); }, 2000);
      }
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  if (sent) {
    return <span className="text-emerald-400 text-xs">✅ Sent to Opus</span>;
  }

  if (!open) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-zinc-500 hover:text-indigo-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-zinc-800"
        title="Send comment to Opus"
      >
        💬
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") send(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Tell Opus..."
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs w-48 focus:border-indigo-500 outline-none"
      />
      <button
        onClick={(e) => { e.stopPropagation(); send(); }}
        disabled={sending || !comment.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-2 py-1 rounded text-xs font-medium"
      >
        {sending ? "..." : "Send"}
      </button>
      <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
    </div>
  );
}
