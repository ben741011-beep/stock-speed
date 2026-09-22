import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";
import { isDeepStrictEqual } from "node:util";

const { model, models, Schema } = mongoose;

export const FUTURES_MARKET_PRICE_COLLECTION = "futuresMarketPrices";

const futuresMarketPriceSchema = new Schema(
  {
    symbol: { type: String, required: true, enum: ["TMF"], immutable: true },
    contractMonth: { type: String, required: true, match: /^\d{4}(0[1-9]|1[0-2])$/, immutable: true },
    price: { type: Number, required: true, min: Number.MIN_VALUE },
    quoteDate: { type: Date, required: true },
    tradingSession: { type: String, required: true, enum: ["regular", "after-hours"] },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: FUTURES_MARKET_PRICE_COLLECTION, autoCreate: false, autoIndex: false },
);

futuresMarketPriceSchema.index(
  { symbol: 1, contractMonth: 1 },
  { unique: true, name: "symbol_1_contractMonth_1" },
);

export const FUTURES_MARKET_PRICE_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["symbol", "contractMonth", "price", "quoteDate", "tradingSession", "fetchedAt", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      symbol: { bsonType: "string", enum: ["TMF"] },
      contractMonth: { bsonType: "string", pattern: "^\\d{4}(0[1-9]|1[0-2])$" },
      price: { bsonType: ["int", "long", "double", "decimal"], minimum: 0, exclusiveMinimum: true },
      quoteDate: { bsonType: "date" },
      tradingSession: { bsonType: "string", enum: ["regular", "after-hours"] },
      fetchedAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
} as const;

export type FuturesMarketPrice = InferSchemaType<typeof futuresMarketPriceSchema>;
export type StoredFuturesMarketPrice = {
  id: string;
  symbol: "TMF";
  contractMonth: string;
  price: number;
  quoteDate: string;
  tradingSession: "regular" | "after-hours";
  fetchedAt: string;
};

export const FuturesMarketPriceModel: Model<FuturesMarketPrice> =
  (models.FuturesMarketPrice as Model<FuturesMarketPrice>)
  || model<FuturesMarketPrice>("FuturesMarketPrice", futuresMarketPriceSchema);

function normalizeContractMonth(contractMonth: string) {
  const value = contractMonth.trim();
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(value)) throw new Error("微臺契約月份必須是 YYYYMM。");
  return value;
}

function parseQuoteDate(quoteDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quoteDate)) throw new Error("微臺行情日期格式不正確。");
  const value = new Date(`${quoteDate}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== quoteDate) {
    throw new Error("微臺行情日期格式不正確。");
  }
  return value;
}

function serializeFuturesMarketPrice(record: {
  _id: Types.ObjectId;
  symbol: string;
  contractMonth: string;
  price: number;
  quoteDate: Date;
  tradingSession: string;
  fetchedAt: Date;
}): StoredFuturesMarketPrice {
  return {
    id: record._id.toString(),
    symbol: "TMF",
    contractMonth: record.contractMonth,
    price: record.price,
    quoteDate: record.quoteDate.toISOString().slice(0, 10),
    tradingSession: record.tradingSession === "after-hours" ? "after-hours" : "regular",
    fetchedAt: record.fetchedAt.toISOString(),
  };
}

export function shouldReplaceFuturesQuote(
  existing: { quoteDate: string; tradingSession: "regular" | "after-hours"; price: number },
  incoming: { quoteDate: string; tradingSession: "regular" | "after-hours"; price: number },
) {
  const existingRank = existing.tradingSession === "regular" ? 1 : 0;
  const incomingRank = incoming.tradingSession === "regular" ? 1 : 0;
  if (incoming.quoteDate !== existing.quoteDate) return incoming.quoteDate > existing.quoteDate;
  if (incomingRank !== existingRank) return incomingRank > existingRank;
  return incoming.price !== existing.price;
}

export async function assertFuturesMarketPriceSchema() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const info = (await database.listCollections({ name: FUTURES_MARKET_PRICE_COLLECTION }).toArray())[0];
  if (!info) throw new Error("微臺行情 collection 尚未完成設定。");
  const options = "options" in info ? info.options : undefined;
  const indexes = await database.collection(FUTURES_MARKET_PRICE_COLLECTION).indexes();
  const identityIndex = indexes.find((index) => index.name === "symbol_1_contractMonth_1");
  if (!isDeepStrictEqual(options?.validator, FUTURES_MARKET_PRICE_VALIDATOR)
    || options?.validationLevel !== "strict" || options?.validationAction !== "error"
    || !identityIndex || !isDeepStrictEqual(identityIndex.key, { symbol: 1, contractMonth: 1 })
    || identityIndex.unique !== true) {
    throw new Error("微臺行情 collection 的 validator 或索引不符合預期。");
  }
}

export async function getStoredFuturesMarketPrice(symbol: "TMF", contractMonth: string) {
  await assertFuturesMarketPriceSchema();
  const record = await FuturesMarketPriceModel.findOne({ symbol, contractMonth: normalizeContractMonth(contractMonth) }).lean();
  return record ? serializeFuturesMarketPrice(record) : null;
}

export async function upsertFuturesMarketPrice(input: {
  symbol: "TMF";
  contractMonth: string;
  price: number;
  quoteDate: string;
  tradingSession: "regular";
}) {
  await assertFuturesMarketPriceSchema();
  const contractMonth = normalizeContractMonth(input.contractMonth);
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("微臺行情必須是大於 0 的數字。");
  if (input.tradingSession !== "regular") throw new Error("微臺行情只接受一般盤結算價。");
  const quoteDate = parseQuoteDate(input.quoteDate);
  const existing = await FuturesMarketPriceModel.findOne({ symbol: input.symbol, contractMonth }).lean();
  if (existing) {
    const existingDate = existing.quoteDate.toISOString().slice(0, 10);
    if (!shouldReplaceFuturesQuote({
      quoteDate: existingDate,
      tradingSession: existing.tradingSession === "after-hours" ? "after-hours" : "regular",
      price: existing.price,
    }, input)) {
      return { quote: serializeFuturesMarketPrice(existing), matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
    }
  }

  const now = new Date();
  const result = await FuturesMarketPriceModel.updateOne(
    { symbol: input.symbol, contractMonth },
    {
      $set: { price: input.price, quoteDate, tradingSession: input.tradingSession, fetchedAt: now, updatedAt: now },
      $setOnInsert: { symbol: input.symbol, contractMonth, createdAt: now },
    },
    { upsert: true, runValidators: true },
  );
  const id = result.upsertedId ?? existing?._id;
  if (!id) throw new Error("無法確認微臺行情儲存結果。");
  const verified = await FuturesMarketPriceModel.findById(id).lean();
  if (!verified) throw new Error("微臺行情儲存後查回驗證失敗。");
  return {
    quote: serializeFuturesMarketPrice(verified),
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
