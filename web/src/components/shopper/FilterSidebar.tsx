'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export type SpecOptions = Record<string, string[]>;

export default function FilterSidebar({
  priceRange,
  specOptions
}: {
  priceRange: { min: number; max: number };
  specOptions: SpecOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentMin = Number(searchParams.get('minPrice') ?? priceRange.min);
  const currentMax = Number(searchParams.get('maxPrice') ?? priceRange.max);
  const currentSort = searchParams.get('sort') ?? 'date-desc';

  const [minPrice, setMinPrice] = useState(currentMin);
  const [maxPrice, setMaxPrice] = useState(currentMax);
  const [sort, setSort] = useState(currentSort);
  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const key of Object.keys(specOptions)) {
      const value = searchParams.get(`spec_${key}`);
      if (value) {
        initial[key] = value;
      } else {
        initial[key] = 'all';
      }
    }
    return initial;
  });

  const specKeys = useMemo(() => Object.keys(specOptions), [specOptions]);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.set('minPrice', String(minPrice));
    params.set('maxPrice', String(maxPrice));
    params.set('sort', sort);

    specKeys.forEach((key) => {
      if (specs[key] && specs[key] !== 'all') {
        params.set(`spec_${key}`, specs[key]);
      } else {
        params.delete(`spec_${key}`);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <aside className="glass-panel sticky top-24 space-y-6 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Filters</h2>
        <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-emerald-300">
          Reset
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-300">Price Range</p>
        <Slider
          min={priceRange.min}
          max={priceRange.max}
          value={[minPrice, maxPrice]}
          onValueChange={(value) => {
            setMinPrice(value[0]);
            setMaxPrice(value[1]);
          }}
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={minPrice}
            onChange={(event) => setMinPrice(Number(event.target.value))}
          />
          <Input
            type="number"
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">Sort</p>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="price-asc">Price low → high</SelectItem>
            <SelectItem value="price-desc">Price high → low</SelectItem>
            <SelectItem value="source">Source A → Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {specKeys.map((key) => (
        <div className="space-y-2" key={key}>
          <p className="text-sm text-slate-300 capitalize">{key.replace('_', ' ')}</p>
          <Select value={specs[key] || 'all'} onValueChange={(value) => setSpecs((prev) => ({ ...prev, [key]: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${key}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {specOptions[key].map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <button
        onClick={applyFilters}
        className="w-full rounded-md bg-emerald-500/80 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        Apply filters
      </button>

      <div className="flex flex-wrap gap-2">
        <Badge className="border-white/10 bg-white/5 text-slate-200">Live sync</Badge>
        <Badge className="border-white/10 bg-white/5 text-slate-200">Deduped</Badge>
      </div>
    </aside>
  );
}
