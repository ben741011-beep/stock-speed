import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URI ?? process.env.mongodb_url;

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalMongoose.mongooseCache ?? { connection: null, promise: null };
globalMongoose.mongooseCache = cache;

export async function connectToDatabase() {
  if (!MONGODB_URL) {
    throw new Error("缺少 MONGODB_URI 環境變數。");
  }

  if (cache.connection) {
    return cache.connection;
  }

  cache.promise ??= mongoose.connect(MONGODB_URL, { bufferCommands: false });
  cache.connection = await cache.promise;
  return cache.connection;
}
