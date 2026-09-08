import mongoose from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

const { model, models, Schema } = mongoose;

export const TRADE_RECORD_COLLECTION = "traderecords";

const tradeRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true, immutable: true, index: true },
    exposureRecordId: { type: Schema.Types.ObjectId, ref: "ExposureRecord", required: true, immutable: true, index: true },
    side: { type: String, required: true, enum: ["buy", "sell"], index: true },
    shares: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    cashChange: { type: Number, required: true },
    costBasisReduction: { type: Number, default: 0, min: 0 },
    tradeProfitLoss: { type: Number, default: 0 },
    realizedProfitLossAfter: { type: Number, default: 0 },
    investmentAfter: { type: Number, required: true, min: 0 },
    holdingSharesAfter: { type: Number, required: true, min: 0 },
    cashAfter: { type: Number, required: true, min: 0 },
    portfolioValueAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: TRADE_RECORD_COLLECTION },
);

tradeRecordSchema.index({ userId: 1, createdAt: -1 }, { name: "userId_1_createdAt_-1" });
tradeRecordSchema.index({ userId: 1, exposureRecordId: 1, createdAt: 1 }, { name: "userId_1_exposureRecordId_1_createdAt_1" });

const numeric = { bsonType: ["int", "long", "double", "decimal"] };
const nonnegative = { ...numeric, minimum: 0 };

export const TRADE_RECORD_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "exposureRecordId", "side", "shares", "price", "amount", "fee", "tax", "cashChange", "investmentAfter", "holdingSharesAfter", "cashAfter", "portfolioValueAfter", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      exposureRecordId: { bsonType: "objectId" },
      side: { enum: ["buy", "sell"] },
      shares: nonnegative,
      price: nonnegative,
      amount: nonnegative,
      fee: nonnegative,
      tax: nonnegative,
      cashChange: numeric,
      costBasisReduction: nonnegative,
      tradeProfitLoss: numeric,
      realizedProfitLossAfter: numeric,
      investmentAfter: nonnegative,
      holdingSharesAfter: nonnegative,
      cashAfter: nonnegative,
      portfolioValueAfter: nonnegative,
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
};

export type TradeRecord = InferSchemaType<typeof tradeRecordSchema>;

export const TradeRecordModel: Model<TradeRecord> =
  (models.TradeRecord as Model<TradeRecord>) ||
  model<TradeRecord>("TradeRecord", tradeRecordSchema);
