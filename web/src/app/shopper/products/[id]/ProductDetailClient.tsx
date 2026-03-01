'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PriceChart from '@/components/shopper/PriceChart';

export type ProductDetail = {
  _id: string;
  title: string;
  price: number;
  source_url: string;
  source_name: string;
  location?: string;
  specs?: Record<string, string>;
  date_last_seen?: string;
  date_found?: string;
  image_url?: string;
  images?: string[];
  notes?: string;
  category?: string;
};

/* ── Pencil icon ────────────────────────────────── */
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? 'h-4 w-4'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

/* ── Inline editable field ──────────────────────── */
function EditableField({
  value, onSave, type = 'text', className, inputClassName, placeholder, displayValue,
}: {
  value: string | number;
  onSave: (next: string) => Promise<void> | void;
  type?: 'text' | 'number' | 'url';
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  displayValue?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(String(value ?? ''));
    }
  }, [value, editing]);

  const commit = async () => {
    if (draft !== String(value ?? '')) await onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type={type} value={draft} placeholder={placeholder} autoFocus
        className={inputClassName}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(String(value ?? '')); setEditing(false); }
        }}
      />
    );
  }

  const display = displayValue ?? (value ? String(value) : placeholder ?? 'Click to edit');
  return (
    <span
      className={`group inline-flex cursor-pointer items-center gap-1.5 ${className ?? ''}`}
      role="button" tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true); }}
    >
      <span className={!value && !displayValue ? 'italic text-slate-500' : undefined}>{display}</span>
      <PencilIcon className="h-3.5 w-3.5 text-slate-500 opacity-0 transition group-hover:opacity-100" />
    </span>
  );
}

/* ── Source link with clickable URL + edit pencil ── */
function SourceLink({ url, onSave }: { url: string; onSave: (v: string) => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url ?? '');

  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(url ?? '');
    }
  }, [url, editing]);

  const commit = async () => {
    if (draft !== url) await onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type="url" value={draft} placeholder="https://..." autoFocus
        className="text-sm"
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(url ?? ''); setEditing(false); }
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-200 hover:text-emerald-100">
          View original listing →
        </a>
      ) : (
        <span className="italic text-slate-500">No source link</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="text-slate-500 hover:text-emerald-300 transition"
        title="Edit link"
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────── */
export default function ProductDetailClient({
  product: initial, history,
}: {
  product: ProductDetail;
  history: { price: number; date: string | Date }[];
}) {
  const [product, setProduct] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Notes with debounced auto-save
  const [notesDraft, setNotesDraft] = useState(product.notes ?? '');
  const notesTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const galleryImages = useMemo(() => {
    const imgs = product.images ?? [];
    const main = product.image_url ? [product.image_url] : [];
    return Array.from(new Set([...main, ...imgs]));
  }, [product.images, product.image_url]);

  // New spec form
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  /* ── helpers ── */
  const save = useCallback(async (update: Partial<ProductDetail>) => {
    const prev = product;
    setProduct((p) => ({ ...p, ...update }));
    const res = await fetch('/api/shopper/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product._id, ...update }),
    });
    if (!res.ok) setProduct(prev);
  }, [product]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images', f));
    const res = await fetch(`/api/shopper/products/${product._id}/images`, { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      setProduct((p) => ({ ...p, images: data.images, image_url: data.image_url ?? p.image_url }));
    }
    setUploading(false);
  };

  const saveNotes = useCallback(async (text: string) => {
    await fetch('/api/shopper/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product._id, notes: text }),
    });
  }, [product._id]);

  const handleNotesChange = (text: string) => {
    setNotesDraft(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(text), 1000);
  };

  const saveSpec = async (key: string, value: string) => {
    const specs = { ...(product.specs ?? {}), [key]: value };
    await save({ specs });
  };

  const deleteSpec = async (key: string) => {
    const specs = { ...(product.specs ?? {}) };
    delete specs[key];
    await save({ specs });
  };

  const addSpec = async () => {
    if (!newSpecKey.trim()) return;
    await saveSpec(newSpecKey.trim(), newSpecValue.trim());
    setNewSpecKey('');
    setNewSpecValue('');
  };

  /* ── drag & drop ── */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">Listing Detail</p>
          <EditableField
            value={product.title}
            onSave={(v) => save({ title: v })}
            className="text-3xl font-semibold text-white"
          />
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Source:</span>
            <EditableField value={product.source_name} onSave={(v) => save({ source_name: v })} placeholder="Source name" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-slate-400">Current Price</p>
          <EditableField
            value={product.price}
            type="number"
            onSave={(v) => save({ price: Number(v) })}
            displayValue={`$${product.price.toLocaleString()}`}
            className="text-3xl font-semibold text-emerald-300"
          />
          <SourceLink
            url={product.source_url}
            onSave={(v) => save({ source_url: v })}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left column: image gallery + upload + notes */}
        <div className="space-y-6">
          {/* Image gallery */}
          <Card className="glass-panel overflow-hidden">
            <CardContent className="space-y-4">
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {galleryImages.map((src, i) => (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg">
                      <Image src={src} alt={`Image ${i + 1}`} fill className="object-cover" sizes="250px" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No images yet</p>
              )}

              {/* Upload area */}
              <div
                className={`relative flex min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition ${
                  dragging ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
                <div className="text-center text-sm text-slate-400">
                  {uploading ? (
                    <span className="animate-pulse">Uploading…</span>
                  ) : (
                    <>
                      <p className="font-medium">Drop images here or click to upload</p>
                      <p className="text-xs text-slate-500">JPG, PNG, WebP</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="glass-panel">
            <CardContent className="space-y-2">
              <h2 className="text-lg font-semibold text-white">📝 Notes</h2>
              <textarea
                value={notesDraft}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={() => saveNotes(notesDraft)}
                placeholder="Add your personal notes about this listing…"
                rows={5}
                className="w-full resize-y rounded-md border border-white/10 bg-base-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: specs + price history */}
        <div className="space-y-6">
          <Card className="glass-panel">
            <CardContent className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Specs</h2>

              <div className="space-y-2">
                {product.specs && Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Badge className="border-white/10 bg-white/5 text-slate-400 text-xs shrink-0">{key}</Badge>
                    <EditableField
                      value={value}
                      onSave={(v) => saveSpec(key, v)}
                      className="text-sm text-slate-200"
                    />
                    <button
                      onClick={() => deleteSpec(key)}
                      className="text-xs text-red-400/60 opacity-0 hover:text-red-400 hover:opacity-100 transition"
                      title="Remove spec"
                    >✕</button>
                  </div>
                ))}
              </div>

              {/* Add spec */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Input
                  value={newSpecKey}
                  onChange={(e) => setNewSpecKey(e.target.value)}
                  placeholder="Key"
                  className="h-8 w-28 text-xs"
                />
                <Input
                  value={newSpecValue}
                  onChange={(e) => setNewSpecValue(e.target.value)}
                  placeholder="Value"
                  className="h-8 flex-1 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') addSpec(); }}
                />
                <button
                  onClick={addSpec}
                  className="shrink-0 rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition"
                >+ Add</button>
              </div>

              <div className="pt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Location:</span>
                  <EditableField value={product.location ?? ''} onSave={(v) => save({ location: v })} placeholder="Add location" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Price History</h2>
            <PriceChart history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}
