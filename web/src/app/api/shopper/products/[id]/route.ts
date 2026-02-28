import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/shopper-db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const history = await db
    .collection('price_history')
    .find({ product_id: new ObjectId(id) })
    .sort({ date: 1 })
    .toArray();

  return NextResponse.json({ product, history });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const body = await req.json();
  const update = { ...body };
  if (update.date_found) update.date_found = new Date(update.date_found);
  if (update.date_last_seen) update.date_last_seen = new Date(update.date_last_seen);

  await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.collection('products').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
