"use client";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CommentButton } from "./CommentButton";

type ReceiptAttachment = {
  _id: string;
  transaction_id: string;
  filename?: string;
  image: string;
  created_at?: string;
  line_items?: { name: string; qty?: number; price?: number }[];
};

type AmazonItem = {
  name: string;
  qty?: number;
  price?: number;
  order_id?: string;
};

type Transaction = {
  transaction_id: string;
  date?: string | Date;
  description?: string;
  category?: string;
  account?: string;
  amount: number;
  receipt_attachment_count?: number;
  amazon_items?: AmazonItem[];
};

export function TransactionRow({ t, showAccount = true }: { t: Transaction; showAccount?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<ReceiptAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttachments, setHasAttachments] = useState(Boolean(t.receipt_attachment_count));
  const [ocring, setOcring] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ruleLink = `/rules?create=true&description=${encodeURIComponent(t.description || "")}&category=${encodeURIComponent(t.category || "")}`;

  useEffect(() => {
    if (!expanded) return;
    if (attachments.length > 0) return;
    void loadAttachments();
  }, [expanded]);

  const amazonItems = useMemo<AmazonItem[]>(() => {
    if (!Array.isArray(t.amazon_items)) return [];
    return t.amazon_items;
  }, [t.amazon_items]);

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    setError(null);
    try {
      const res = await fetch(`/api/receipts/${t.transaction_id}`);
      if (!res.ok) throw new Error("Failed to load receipts");
      const data = await res.json();
      setAttachments(data);
      setHasAttachments(data.length > 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load receipts");
    }
    setLoadingAttachments(false);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploads = Array.from(files);
      for (const file of uploads) {
        const dataUrl = await readFileAsDataUrl(file);
        const res = await fetch("/api/finance/receipts/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: t.transaction_id,
            image: dataUrl,
            filename: file.name,
          }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const attachment = await res.json();
        setAttachments((prev) => [attachment, ...prev]);
        setHasAttachments(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  };

  const runOcr = async (attachment: ReceiptAttachment) => {
    if (!attachment?.image) return;
    setOcring(attachment._id);
    setError(null);
    try {
      const res = await fetch("/api/finance/receipts/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: attachment.image, attachment_id: attachment._id }),
      });
      if (!res.ok) throw new Error("OCR failed");
      const data = await res.json();
      setAttachments((prev) =>
        prev.map((item) => (item._id === attachment._id ? { ...item, line_items: data.items || [] } : item))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OCR failed");
    }
    setOcring(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      <tr
        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 group cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">
          {t.date ? formatDate(t.date) : "-"}
        </td>
        <td className="px-4 py-2 max-w-sm truncate">
          <div className="flex items-center gap-2">
            <span className="truncate">{t.description}</span>
            {hasAttachments && <span className="text-zinc-400 text-xs">🧾</span>}
            {amazonItems.length > 0 && <span className="text-amber-400 text-xs">🛒</span>}
          </div>
        </td>
        <td className="px-4 py-2">
          <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{t.category}</span>
        </td>
        {showAccount && <td className="px-4 py-2 text-zinc-400 text-xs">{t.account}</td>}
        <td className={`px-4 py-2 text-right font-mono ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {formatCurrency(t.amount)}
        </td>
        <td className="px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={ruleLink}
            className="inline-flex items-center justify-center text-xs text-zinc-400 hover:text-zinc-200 mr-2"
            onClick={(e) => e.stopPropagation()}
            title="Create rule from this transaction"
          >
            ⚙️
          </Link>
          <CommentButton
            transactionId={t.transaction_id}
            description={t.description}
            amount={formatCurrency(t.amount)}
            category={t.category}
            date={t.date ? formatDate(t.date) : ""}
            page="transactions"
          />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-950/60">
          <td colSpan={showAccount ? 6 : 5} className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Receipt attachments</p>
                  <p className="text-xs text-zinc-500">Upload a receipt photo or drag & drop.</p>
                </div>
                <button
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => setExpanded(false)}
                >
                  Collapse
                </button>
              </div>

              <div
                className={`border border-dashed rounded-xl p-4 bg-zinc-900/40 transition-colors ${
                  dragActive ? "border-indigo-400 bg-indigo-500/10" : "border-zinc-700"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span className="text-lg">📸</span>
                  <div>
                    <p className="text-zinc-300">Drop receipt images here, or click to upload.</p>
                    <p className="text-xs text-zinc-500">PNG/JPG, one or multiple files.</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && void handleFiles(e.target.files)}
                />
              </div>

              {uploading && <p className="text-xs text-zinc-400">Uploading...</p>}
              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="space-y-4">
                {loadingAttachments && <p className="text-xs text-zinc-400">Loading receipts...</p>}
                {!loadingAttachments && attachments.length === 0 && (
                  <p className="text-xs text-zinc-500">No receipts attached yet.</p>
                )}
                {attachments.map((attachment) => (
                  <div key={attachment._id} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-zinc-200">{attachment.filename || "Receipt"}</p>
                        <p className="text-xs text-zinc-500">{attachment.created_at ? formatDate(attachment.created_at) : ""}</p>
                      </div>
                      <button
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded"
                        onClick={() => void runOcr(attachment)}
                        disabled={ocring === attachment._id}
                      >
                        {ocring === attachment._id ? "Extracting..." : "Extract line items"}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                      <img
                        src={attachment.image}
                        alt={attachment.filename || "Receipt"}
                        className="w-full h-auto rounded-lg border border-zinc-800"
                      />
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-400">Line items</p>
                        {attachment.line_items && attachment.line_items.length > 0 ? (
                          <div className="space-y-1 text-xs">
                            {attachment.line_items.map((item, idx) => (
                              <div
                                key={`${attachment._id}-item-${idx}`}
                                className="flex items-center justify-between border-b border-zinc-800/60 pb-1"
                              >
                                <span className="text-zinc-200">
                                  {item.name}
                                  {item.qty ? ` ×${item.qty}` : ""}
                                </span>
                                <span className="text-zinc-300 font-mono">
                                  {typeof item.price === "number" ? formatCurrency(item.price) : "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">No line items extracted yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {amazonItems.length > 0 && (
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40">
                  <p className="text-sm text-zinc-200 mb-2">Amazon order items</p>
                  <div className="space-y-1 text-xs">
                    {amazonItems.map((item, idx) => (
                      <div key={`amazon-${idx}`} className="flex items-center justify-between">
                        <span className="text-zinc-200">
                          {item.name}
                          {item.qty ? ` ×${item.qty}` : ""}
                          {item.order_id ? ` · ${item.order_id}` : ""}
                        </span>
                        <span className="text-zinc-300 font-mono">
                          {typeof item.price === "number" ? formatCurrency(item.price) : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SimpleTransactionRow({ t }: { t: Transaction }) {
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 group">
      <td className="py-2 text-zinc-400">{t.date ? formatDate(t.date) : "-"}</td>
      <td className="py-2 max-w-xs truncate">{t.description}</td>
      <td className="py-2">
        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{t.category}</span>
      </td>
      <td className={`py-2 text-right font-mono ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {formatCurrency(t.amount)}
      </td>
      <td className="py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CommentButton
          transactionId={t.transaction_id}
          description={t.description}
          amount={formatCurrency(t.amount)}
          category={t.category}
          date={t.date ? formatDate(t.date) : ""}
          page="dashboard"
        />
      </td>
    </tr>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
