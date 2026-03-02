import CategoryCard from '@/components/shopper/CategoryCard';
import { Card, CardContent } from '@/components/ui/card';
import { getDb } from '@/lib/shopper-db';

export default async function HomePage() {
  const db = await getDb();
  const categories = await db
    .collection('products')
    .aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray();

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">Shopper Dashboard</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Monitor every marketplace in one clean control center.</h1>
          <p className="text-base text-slate-400">
            Track price trends, surface new listings, and jump into the most relevant deals across bikes and vehicles.
          </p>
        </div>
        <Card className="glass-panel">
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-400">Data Sources</p>
            <ul className="text-sm text-slate-200">
              <li>The Pro&apos;s Closet</li>
              <li>Competitive Cyclist</li>
              <li>eBay</li>
              <li>PinkBike</li>
              <li>AutoTrader · Cars.com · CarGurus</li>
            </ul>
            <p className="pt-4 text-xs text-emerald-200">Live listings + manual curation</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="text-slate-400">No products yet. Run the seed script to load demo data.</CardContent>
          </Card>
        ) : (
          categories.map((category) => (
            <CategoryCard key={category._id} slug={category._id} count={category.count} />
          ))
        )}
      </section>
    </div>
  );
}
