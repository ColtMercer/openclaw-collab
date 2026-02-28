import { MongoClient, Db } from "mongodb";

const uri = process.env.FINANCE_MONGODB_URI || "mongodb://opus:opus_dev@localhost:27017/tiller_finance?authSource=admin";
const dbName = "tiller_finance";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _financeMongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._financeMongoClientPromise) {
    client = new MongoClient(uri);
    global._financeMongoClientPromise = client.connect();
  }
  clientPromise = global._financeMongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  return c.db(dbName);
}

export default clientPromise;
