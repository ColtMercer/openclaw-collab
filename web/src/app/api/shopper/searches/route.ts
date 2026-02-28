import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/shopper-db';

export async function GET() {
  const db = await getDb();
  const searches = await db.collection('searches').find({}).toArray();
  return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();
  const payload = {
    ...body,
    active: body.active ?? true
  };
  const result = await db.collection('searches').insertOne(payload);
  return NextResponse.json({ id: result.insertedId });
}
