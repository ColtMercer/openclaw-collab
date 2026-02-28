import { NextResponse } from 'next/server';
import { getDb } from '@/lib/shopper-db';

export async function GET() {
  const db = await getDb();
  const categories = await db
    .collection('products')
    .aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    .toArray();

  return NextResponse.json({
    categories: categories.map((cat) => ({
      slug: cat._id,
      count: cat.count
    }))
  });
}
