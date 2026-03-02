'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

const blurData =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDY0MCA0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0MCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxMDE1MjEiLz48L3N2Zz4=';

export type ProductCardData = {
  _id: string;
  title: string;
  price: number;
  image_url?: string;
  source_url: string;
  source_name: string;
  category: string;
  specs?: Record<string, string>;
  date_found: string | Date;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const dateFound = new Date(product.date_found);
  // Check isNew on client only to avoid hydration mismatch
  const [isNew, setIsNew] = React.useState(false);
  React.useEffect(() => {
    setIsNew(Date.now() - dateFound.getTime() < 1000 * 60 * 60 * 24);
  }, [dateFound]);

  return (
    <Card className="group overflow-hidden">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={product.image_url || '/placeholder.svg'}
          alt={product.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
          placeholder="blur"
          blurDataURL={blurData}
        />
        {isNew && <span className="absolute left-3 top-3 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">New finds</span>}
      </div>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{product.title}</h3>
          <span className="text-lg font-semibold text-emerald-300">${product.price.toLocaleString()}</span>
        </div>
        <p className="text-sm text-slate-400">Source: {product.source_name}</p>
        {product.specs && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {Object.entries(product.specs)
              .slice(0, 3)
              .map(([key, value]) => (
                <Badge key={key} className="border-white/10 bg-white/5 text-slate-200">
                  {key}: {value}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-slate-400">
        <span>Found {format(dateFound, 'MMM d, yyyy')}</span>
        <div className="flex items-center gap-3">
          <Link href={product.source_url} target="_blank" className="text-slate-300 hover:text-emerald-200">
            Original →
          </Link>
          <Link href={`/shopper/products/${product._id}`} className="text-emerald-300 hover:text-emerald-200">
            Details →
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
