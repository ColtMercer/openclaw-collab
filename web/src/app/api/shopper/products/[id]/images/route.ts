import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/shopper-db';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const db = await getDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll('images') as File[];
  if (!files.length) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });

  const uploadDir = join(process.cwd(), 'public', 'uploads', productId);
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const uploadedPaths: string[] = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadDir, filename);
    writeFileSync(filePath, Buffer.from(bytes));
    uploadedPaths.push(`/uploads/${productId}/${filename}`);
  }

  const updatedImages = [...(product.images ?? []), ...uploadedPaths];
  const update: Record<string, unknown> = { images: updatedImages };
  if (!product.image_url) {
    update.image_url = updatedImages[0];
  }

  await db.collection('products').updateOne(
    { _id: new ObjectId(productId) },
    { $set: update }
  );

  return NextResponse.json({ images: updatedImages, image_url: update.image_url ?? product.image_url });
}
