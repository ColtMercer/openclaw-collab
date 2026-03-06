import { MongoClient, ObjectId } from 'mongodb';

export type SocialPlatform = 'tiktok' | 'twitter';
export type SocialStatus = 'draft' | 'pending_review' | 'approved' | 'posted';

export type SocialEngagement = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  updated_at?: Date;
};

export type SocialPostDocument = {
  _id?: ObjectId;
  title: string;
  platform: SocialPlatform;
  script: string;
  hook: string;
  hashtags: string[];
  status: SocialStatus;
  video_path?: string;
  posted_at?: Date;
  publish_id?: string;
  engagement: SocialEngagement;
  notes: string;
  created_at: Date;
  topic: string;
  performance_notes?: string;
};

const uri =
  process.env.SOCIAL_MONGODB_URI ||
  process.env.MONGODB_URI ||
  'mongodb://opus:opus_dev@localhost:27017/openclaw_collab?authSource=admin';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  client = await clientPromise;
  return client;
}

export async function getSocialDb() {
  const mongo = await getMongoClient();
  return mongo.db('openclaw_collab');
}

export async function getSocialCollection() {
  const db = await getSocialDb();
  return db.collection<SocialPostDocument>('social_posts');
}

const seedPosts: SocialPostDocument[] = [
  {
    title: 'Is your dog actually bored or under-stimulated?',
    platform: 'tiktok',
    script:
      'Start with a quick cut of a restless pup. Explain the 3 signs of under-stimulation, then show 2 quick fixes: puzzle feeder and sniff walk. End with a call to share their dog\'s quirks.',
    hook: 'Most bored dogs aren\'t tired, they\'re under-challenged.',
    hashtags: ['dogtraining', 'petcare', 'dogtok'],
    status: 'draft',
    engagement: { views: 0, likes: 0, comments: 0, shares: 0 },
    notes: 'Need a b-roll clip of the puzzle feeder.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    topic: 'Dog enrichment',
  },
  {
    title: 'Three-line thread: AI video workflow',
    platform: 'twitter',
    script:
      '1/ The fastest way we cut TikTok edits now. 2/ Record in one take, script in bullet points, edit with text overlays. 3/ Batch 5 hooks so you never restart from scratch.',
    hook: 'We cut TikTok edits 40% faster with this 3-step loop.',
    hashtags: ['contentmarketing', 'growth', 'videoediting'],
    status: 'pending_review',
    engagement: { views: 0, likes: 0, comments: 0, shares: 0 },
    notes: 'Awaiting review from brand lead.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    topic: 'Creator workflow',
  },
  {
    title: 'Before/after: 7s hook test',
    platform: 'tiktok',
    script:
      'Show the original intro (7s of setup) then the optimized hook (1.5s). Narrate the change and show the lift in retention and saves. Close with prompt to comment "HOOK" for the template.',
    hook: 'We trimmed 5.5 seconds and doubled retention.',
    hashtags: ['tiktoktips', 'creator', 'marketing'],
    status: 'posted',
    engagement: {
      views: 48320,
      likes: 3920,
      comments: 318,
      shares: 512,
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    notes: 'Great response on the before/after format.',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    posted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    publish_id: 'tt_pub_8472',
    topic: 'Hook optimization',
    performance_notes: 'Shorter hook + on-screen text drove higher saves.',
  },
];

export async function ensureSocialSeedData() {
  const collection = await getSocialCollection();
  const count = await collection.countDocuments();
  if (count > 0) return;
  await collection.insertMany(seedPosts);
}

export function serializeSocialPost(doc: SocialPostDocument) {
  return {
    ...doc,
    _id: doc._id ? doc._id.toString() : '',
    created_at: doc.created_at?.toISOString() ?? null,
    posted_at: doc.posted_at?.toISOString() ?? null,
    engagement: {
      ...doc.engagement,
      updated_at: doc.engagement.updated_at?.toISOString() ?? null,
    },
  };
}
