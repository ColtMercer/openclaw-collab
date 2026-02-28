import mongoose from "mongoose"

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://opus:opus_dev@localhost:27017/openclaw_collab?authSource=admin"

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = global as typeof global & {
  mongoose: MongooseCache | undefined
}

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (globalForMongoose.mongoose?.conn) {
    return globalForMongoose.mongoose.conn
  }

  if (!globalForMongoose.mongoose?.promise) {
    mongoose.set("strictQuery", false)
    globalForMongoose.mongoose!.promise = mongoose.connect(MONGODB_URI)
  }

  globalForMongoose.mongoose!.conn = await globalForMongoose.mongoose!.promise
  return globalForMongoose.mongoose!.conn
}
