'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AddListingButton({ category }: { category: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    const res = await fetch('/api/shopper/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Listing',
        price: 0,
        source_url: '',
        source_name: 'Manual',
        category,
        specs: {},
        location: '',
      }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      router.push(`/products/${data.id}`);
    }
    setCreating(false);
  };

  return (
    <button
      onClick={create}
      disabled={creating}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
    >
      {creating ? 'Creating…' : '+ Add Listing'}
    </button>
  );
}
