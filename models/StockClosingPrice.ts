import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";

const { model, models, Schema } = mongoose;

export const STOCK_CLOSING_PRICE_COLLECTION = "stockClosingPrices";

const stockClosingPriceSchema = new Schema(
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
    close: { type: Number, required: true, min: 0 },
    quoteDate: { type: Date, required: true },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: STOCK_CLOSING_PRICE_COLLECTION },
);

stockClosingPriceSchema.index({ stockCode: 1 }, { unique: true, name: "stockCode_1" });

export const STOCK_CLOSING_PRICE_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["stockCode", "close", "quoteDate", "fetchedAt", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      stockCode: { bsonType: "string", minLength: 4, maxLength: 10 },
      close: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      quoteDate: { bsonType: "date" },
      fetchedAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
};

export type StockClosingPrice = InferSchemaType<typeof stockClosingPriceSchema>;

export type StoredStockClosingPrice = {
  id: string;
  stockCode: string;
  close: number;
  quoteDate: string;
  fetchedAt: string;
};

export type StockClosingPriceWriteResult = {
  quote: StoredStockClosingPrice;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
};

export const StockClosingPriceModel: Model<StockClosingPrice> =
  (models.StockClosingPrice as Model<StockClosingPrice>) ||
  model<StockClosingPrice>("StockClosingPrice", stockClosingPriceSchema);

function normalizeStockCode(stockCode: string) {
  const value = stockCode.trim().toUpperCase();
  if (!/^[0-9A-Z]{4,10}$/.test(value)) throw new Error("股票代碼格式不正確。");
  return value;
}

function parseQuoteDate(quoteDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quoteDate)) throw new Error("收盤價日期格式不正確。");
  const value = new Date(`${quoteDate}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== quoteDate) {
    throw new Error("收盤價日期格式不正確。");
  }
  return value;
}

function serializeStockClosingPrice(record: {
  _id: Types.ObjectId;
  stockCode: string;
  close: number;
  quoteDate: Date;
  fetchedAt: Date;
}): StoredStockClosingPrice {
  return {
    id: record._id.toString(),
    stockCode: record.stockCode,
    close: record.close,
    quoteDate: record.quoteDate.toISOString().slice(0, 10),
    fetchedAt: record.fetchedAt.toISOString(),
  };
}

export async function getStoredStockClosingPrice(stockCode: string) {
  const record = await StockClosingPriceModel.findOne({ stockCode: normalizeStockCode(stockCode) }).lean();
  return record ? serializeStockClosingPrice(record) : null;
}

export async function upsertStockClosingPrice(input: {
  stockCode: string;
  close: number;
  quoteDate: string;
}): Promise<StockClosingPriceWriteResult> {
  const stockCode = normalizeStockCode(input.stockCode);
  if (!Number.isFinite(input.close) || input.close <= 0) throw new Error("收盤價必須是大於 0 的數字。");

  const existing = await StockClosingPriceModel.findOne({ stockCode }).select({ _id: 1 }).lean();
  const now = new Date();
  const result = await StockClosingPriceModel.updateOne(
    { stockCode },
    {
      $set: {
        close: input.close,
        quoteDate: parseQuoteDate(input.quoteDate),
        fetchedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { stockCode, createdAt: now },
    },
    { upsert: true, runValidators: true },
  );

  const id = result.upsertedId ?? existing?._id;
  if (!id) throw new Error("無法確認收盤價寫入結果。");
  const verified = await StockClosingPriceModel.findById(id).lean();
  if (!verified) throw new Error("收盤價寫入後查回驗證失敗。");

  return {
    quote: serializeStockClosingPrice(verified),
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
