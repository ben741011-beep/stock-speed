import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";
import { isDeepStrictEqual } from "node:util";

const { model, models, Schema } = mongoose;

export const STOCK_INTRADAY_PRICE_COLLECTION = "stockIntradayPrices";

const stockIntradayPriceSchema = new Schema(
  {
    stockCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 4,
      maxlength: 10,
      immutable: true,
    },
    price: { type: Number, required: true, validate: { validator: (value: number) => value > 0, message: "盤中價必須大於 0。" } },
    quoteAt: { type: Date, required: true },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: STOCK_INTRADAY_PRICE_COLLECTION, autoCreate: false, autoIndex: false },
);

stockIntradayPriceSchema.index({ stockCode: 1 }, { unique: true, name: "stockCode_1" });

export const STOCK_INTRADAY_PRICE_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["stockCode", "price", "quoteAt", "fetchedAt", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      stockCode: { bsonType: "string", minLength: 4, maxLength: 10 },
      price: { bsonType: ["int", "long", "double", "decimal"], minimum: 0, exclusiveMinimum: true },
      quoteAt: { bsonType: "date" },
      fetchedAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
} as const;

export type StockIntradayPrice = InferSchemaType<typeof stockIntradayPriceSchema>;

export type StoredStockIntradayPrice = {
  id: string;
  stockCode: string;
  price: number;
  quoteAt: string;
  fetchedAt: string;
};

export const StockIntradayPriceModel: Model<StockIntradayPrice> =
  (models.StockIntradayPrice as Model<StockIntradayPrice>) ||
  model<StockIntradayPrice>("StockIntradayPrice", stockIntradayPriceSchema);

function normalizeStockCode(stockCode: string) {
  const value = stockCode.trim().toUpperCase();
  if (!/^[0-9A-Z]{4,10}$/.test(value)) throw new Error("股票代碼格式不正確。");
  return value;
}

function serializeStockIntradayPrice(record: {
  _id: Types.ObjectId;
  stockCode: string;
  price: number;
  quoteAt: Date;
  fetchedAt: Date;
}): StoredStockIntradayPrice {
  return {
    id: record._id.toString(),
    stockCode: record.stockCode,
    price: record.price,
    quoteAt: record.quoteAt.toISOString(),
    fetchedAt: record.fetchedAt.toISOString(),
  };
}

export async function getStoredStockIntradayPrice(stockCode: string) {
  const record = await StockIntradayPriceModel.findOne({ stockCode: normalizeStockCode(stockCode) }).lean();
  return record ? serializeStockIntradayPrice(record) : null;
}

export async function upsertStockIntradayPrice(input: {
  stockCode: string;
  price: number;
  quoteAt: Date;
}) {
  const stockCode = normalizeStockCode(input.stockCode);
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("盤中價必須是大於 0 的數字。");
  if (Number.isNaN(input.quoteAt.getTime())) throw new Error("盤中成交時間無效。");

  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const info = (await database.listCollections({ name: STOCK_INTRADAY_PRICE_COLLECTION }).toArray())[0];
  const options = info && "options" in info ? info.options : undefined;
  const indexes = info ? await database.collection(STOCK_INTRADAY_PRICE_COLLECTION).indexes() : [];
  const uniqueCodeIndex = indexes.find((index) => index.name === "stockCode_1");
  if (!info || !isDeepStrictEqual(options?.validator, STOCK_INTRADAY_PRICE_VALIDATOR)
    || options?.validationLevel !== "strict" || options?.validationAction !== "error"
    || !uniqueCodeIndex || !isDeepStrictEqual(uniqueCodeIndex.key, { stockCode: 1 }) || uniqueCodeIndex.unique !== true) {
    throw new Error("盤中價 collection 的 validator 或索引尚未完成設定。");
  }

  const existing = await StockIntradayPriceModel.findOne({ stockCode }).lean();
  if (existing && existing.quoteAt >= input.quoteAt) {
    return { quote: serializeStockIntradayPrice(existing), matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
  }

  const now = new Date();
  const result = await StockIntradayPriceModel.updateOne(
    { stockCode },
    {
      $set: { price: input.price, quoteAt: input.quoteAt, fetchedAt: now, updatedAt: now },
      $setOnInsert: { stockCode, createdAt: now },
    },
    { upsert: true, runValidators: true },
  );
  const id = result.upsertedId ?? existing?._id;
  if (!id) throw new Error("無法確認盤中價寫入結果。");
  const verified = await StockIntradayPriceModel.findById(id).lean();
  if (!verified) throw new Error("盤中價寫入後查回驗證失敗。");

  return {
    quote: serializeStockIntradayPrice(verified),
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
