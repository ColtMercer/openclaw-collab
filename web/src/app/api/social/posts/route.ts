import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSocialSeedData,
  getSocialCollection,
  serializeSocialPost,
  type SocialPostDocument,
  type SocialStatus,
} from '@/lib/social-db';

function parseHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(req: NextRequest) {
  await ensureSocialSeedData();
  const collection = await getSocialCollection();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as SocialStatus | null;

  const filters: Partial<SocialPostDocument> = {};
  if (status) filters.status = status;

  const posts = await collection
    .find(filters)
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json({ posts: posts.map(serializeSocialPost) });
}

export async function POST(req: NextRequest) {
  const collection = await getSocialCollection();
  const body = await req.json();
  const now = new Date();
  const status = (body.status as SocialStatus) ?? 'draft';

  const payload: SocialPostDocument = {
    title: body.title ?? 'Untitled post',
    platform: body.platform ?? 'tiktok',
    script: body.script ?? '',
    hook: body.hook ?? '',
    hashtags: parseHashtags(body.hashtags),
    status,
    video_path: body.video_path ?? undefined,
    posted_at: body.posted_at
      ? new Date(body.posted_at)
      : status === 'posted'
      ? now
      : undefined,
    publish_id: body.publish_id ?? undefined,
    engagement: {
      views: Number(body.engagement?.views ?? 0),
      likes: Number(body.engagement?.likes ?? 0),
      comments: Number(body.engagement?.comments ?? 0),
      shares: Number(body.engagement?.shares ?? 0),
      updated_at: body.engagement?.updated_at
        ? new Date(body.engagement.updated_at)
        : undefined,
    },
    notes: body.notes ?? '',
    created_at: body.created_at ? new Date(body.created_at) : now,
    topic: body.topic ?? '',
    performance_notes: body.performance_notes ?? undefined,
  };

  const result = await collection.insertOne(payload);
  return NextResponse.json({ id: result.insertedId.toString() });
}
