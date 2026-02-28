import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Sort } from 'mongodb';
import { getDb } from '@/lib/shopper-db';

function buildFilters(searchParams: URLSearchParams) {
  const filters: Record<string, unknown> = {};

  const category = searchParams.get('category');
  if (category) filters.category = category;

  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice || maxPrice) {
    filters.price = {} as Record<string, number>;
    if (minPrice) (filters.price as Record<string, number>).$gte = Number(minPrice);
    if (maxPrice) (filters.price as Record<string, number>).$lte = Number(maxPrice);
  }

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('spec_') && value) {
      filters[`specs.${key.replace('spec_', '')}`] = value;
    }
  }

  const activeOnly = searchParams.get('active');
  if (activeOnly === 'true') filters.is_active = true;

  return filters;
}

function buildSort(sort: string | null): Sort {
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

export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const filters = buildFilters(searchParams);
  const sort = buildSort(searchParams.get('sort'));
  const limit = Number(searchParams.get('limit') ?? 60);
  const skip = Number(searchParams.get('skip') ?? 0);

  const products = await db
    .collection('products')
    .find(filters)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const payload = {
    ...body,
    price: Number(body.price),
    date_found: body.date_found ? new Date(body.date_found) : new Date(),
    date_last_seen: body.date_last_seen ? new Date(body.date_last_seen) : new Date(),
    is_active: body.is_active ?? true
  };

  const result = await db.collection('products').insertOne(payload);
  return NextResponse.json({ id: result.insertedId });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const update = { ...body };
  delete update.id;
  if (update.date_found) update.date_found = new Date(update.date_found);
  if (update.date_last_seen) update.date_last_seen = new Date(update.date_last_seen);

  await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await db.collection('products').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
