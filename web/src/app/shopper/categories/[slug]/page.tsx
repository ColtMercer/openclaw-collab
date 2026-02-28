import ProductCard from '@/components/shopper/ProductCard';
import FilterSidebar from '@/components/shopper/FilterSidebar';
import AddListingButton from '@/components/shopper/AddListingButton';
import { getDb } from '@/lib/shopper-db';
import type { Sort } from 'mongodb';

const categorySpecs: Record<string, string[]> = {
  'mountain-bikes': ['frame_size', 'wheel_size', 'suspension_travel', 'material', 'groupset', 'condition', 'year'],
  vehicles: ['year', 'trim', 'mileage', 'drivetrain', 'color', 'condition', 'engine']
};

function buildFilters(slug: string, searchParams: Record<string, string | string[] | undefined>) {
  const filters: Record<string, unknown> = { category: slug };

  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : null;
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : null;
  if (minPrice || maxPrice) {
    filters.price = {} as Record<string, number>;
    if (minPrice) (filters.price as Record<string, number>).$gte = minPrice;
    if (maxPrice) (filters.price as Record<string, number>).$lte = maxPrice;
  }

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key.startsWith('spec_') && value) {
      filters[`specs.${key.replace('spec_', '')}`] = value;
    }
  });

  return filters;
}

function buildSort(sort: string | undefined): Sort {
  switch (sort) {
    case 'price-asc':
      return { price: 1 };
    case 'price-desc':
      return { price: -1 };
    case 'date-asc':
      return { date_found: 1 };
    case 'source':
      return { source_name: 1 };
    default:
      return { date_found: -1 };
  }
}

export default async function CategoryPage({
  params,
  searchParams: searchParamsPromise
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const searchParams = await searchParamsPromise;
  const db = await getDb();
  const filters = buildFilters(slug, searchParams);
  const sort = buildSort(typeof searchParams.sort === 'string' ? searchParams.sort : undefined);

  const products = await db.collection('products').find(filters).sort(sort).toArray();

  const priceStats = await db
    .collection('products')
    .aggregate([
      { $match: { category: slug } },
      { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
    ])
    .toArray();

  const priceRange = {
    min: priceStats[0]?.minPrice ?? 0,
    max: priceStats[0]?.maxPrice ?? 10000
  };

  const specKeys = categorySpecs[slug] ?? [];
  const specOptionsEntries = await Promise.all(
    specKeys.map(async (key) => {
      const values = (await db.collection('products').distinct(`specs.${key}`, { category: slug }))
        .filter(Boolean)
        .map(String);
      return [key, values] as [string, string[]];
    })
  );

  const specOptions = Object.fromEntries(specOptionsEntries);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <FilterSidebar priceRange={priceRange} specOptions={specOptions} />

      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">Category</p>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-white capitalize">{slug.replace('-', ' ')}</h1>
            <AddListingButton category={slug} />
          </div>
          <p className="text-sm text-slate-400">{products.length} listings matched current filters.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product._id.toString()}
              product={{
                _id: product._id.toString(),
                title: product.title,
                price: product.price,
                image_url: product.image_url,
                source_url: product.source_url,
                source_name: product.source_name,
                category: product.category,
                specs: product.specs,
                date_found: product.date_found
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
