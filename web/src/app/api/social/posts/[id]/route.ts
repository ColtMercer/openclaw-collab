import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  getSocialCollection,
  serializeSocialPost,
  type SocialPostDocument,
} from '@/lib/social-db';

function normalizeEngagement(value: unknown) {
  const engagement = (value as SocialPostDocument['engagement']) ?? {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };

  return {
    views: Number(engagement.views ?? 0),
    likes: Number(engagement.likes ?? 0),
    comments: Number(engagement.comments ?? 0),
    shares: Number(engagement.shares ?? 0),
    updated_at: engagement.updated_at ? new Date(engagement.updated_at) : new Date(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collection = await getSocialCollection();
  const payload = await request.json();
  const updates: Partial<SocialPostDocument> = { ...payload };
  const unset: Record<string, ""> = {};

  if (updates.created_at) {
    updates.created_at = new Date(updates.created_at);
  }

  if (updates.posted_at) {
    updates.posted_at = new Date(updates.posted_at);
  } else if (payload.posted_at === null) {
    delete updates.posted_at;
    unset.posted_at = "";
  }

  if (updates.status === 'posted' && !updates.posted_at) {
    updates.posted_at = new Date();
  }

  if (updates.engagement) {
    updates.engagement = normalizeEngagement(updates.engagement);
  }

  delete (updates as { _id?: unknown })._id;

  const updateOps: Record<string, unknown> = { $set: updates };
  if (Object.keys(unset).length > 0) {
    updateOps.$unset = unset;
  }

  await collection.updateOne({ _id: new ObjectId(id) }, updateOps);

  const updated = await collection.findOne({ _id: new ObjectId(id) });
  if (!updated) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({ post: serializeSocialPost(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const collection = await getSocialCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
