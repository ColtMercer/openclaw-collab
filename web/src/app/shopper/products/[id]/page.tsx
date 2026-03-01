import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/shopper-db';
import ProductDetailClient, { type ProductDetail } from './ProductDetailClient';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) {
    return <div className="text-slate-400 text-center py-20">Product not found.</div>;
  }

  const history = await db
    .collection('price_history')
    .find({ product_id: new ObjectId(id) })
    .sort({ date: 1 })
    .toArray();

  // Serialize for client
  const serialized = {
    ...product,
    _id: product._id.toString(),
    date_found: product.date_found?.toISOString?.() ?? product.date_found,
    date_last_seen: product.date_last_seen?.toISOString?.() ?? product.date_last_seen,
  };

  const serializedHistory = history.map((p) => ({
    price: p.price,
    date: p.date?.toISOString?.() ?? p.date,
  }));

  return <ProductDetailClient product={serialized as ProductDetail} history={serializedHistory} />;
}
