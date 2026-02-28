import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categoryDescriptions: Record<string, string> = {
  'mountain-bikes': 'Trail, enduro, and all-mountain rigs surfacing daily across DFW.',
  vehicles: 'Latest Ford Bronco listings with trims, mileage, and pricing trends.'
};

export default function CategoryCard({ slug, count }: { slug: string; count: number }) {
  return (
    <Link href={`/shopper/categories/${slug}`} className="block">
      <Card className="group h-full transition hover:-translate-y-1 hover:border-emerald-500/40">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold capitalize text-white">{slug.replace('-', ' ')}</h3>
            <Badge>{count} listings</Badge>
          </div>
          <p className="text-sm text-slate-400">
            {categoryDescriptions[slug] ?? 'Curated listings with live pricing insights.'}
          </p>
          <span className="mt-auto text-sm text-emerald-300">View dashboard →</span>
        </CardContent>
      </Card>
    </Link>
  );
}
