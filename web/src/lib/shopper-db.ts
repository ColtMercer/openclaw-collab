import { MongoClient } from 'mongodb';

const uri = process.env.SHOPPER_MONGODB_URI || 'mongodb://opus:opus_dev@localhost:27017/shopper?authSource=admin';

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

export async function getDb() {
  const mongo = await getMongoClient();
  return mongo.db('shopper');
}
