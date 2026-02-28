'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type PricePoint = {
  price: number;
  date: string | Date;
};

export default function PriceChart({ history, className }: { history: PricePoint[]; className?: string }) {
  const path = useMemo(() => {
    if (!history?.length) return '';
    const prices = history.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return history
      .map((point, index) => {
        const x = (index / Math.max(history.length - 1, 1)) * 100;
        const y = 100 - ((point.price - min) / range) * 100;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [history]);

  if (!history?.length) {
    return <div className="text-sm text-slate-400">No price history yet.</div>;
  }

  return (
    <div className={cn('rounded-xl border border-white/10 bg-base-900/60 p-4', className)}>
      <svg viewBox="0 0 100 100" className="h-24 w-full">
        <path d={path} fill="none" stroke="#53e39a" strokeWidth="2" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>${Math.min(...history.map((h) => h.price)).toLocaleString()}</span>
        <span>${Math.max(...history.map((h) => h.price)).toLocaleString()}</span>
      </div>
    </div>
  );
}
