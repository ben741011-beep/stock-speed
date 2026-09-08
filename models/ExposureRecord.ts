import mongoose from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

const { model, models, Schema } = mongoose;

export const EXPOSURE_RECORD_COLLECTION = "exposurerecords";

const exposureRecordSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
      immutable: true,
      index: true,
    },
    source: { type: String, enum: ["initial", "import"], default: "initial" },
    realizedProfitLoss: { type: Number, default: 0 },
    investment: { type: Number, required: true, min: 0 },
    holdingShares: { type: Number, min: 0, default: 0 },
    cash: { type: Number, required: true, min: 0 },
    portfolioValue: { type: Number, required: true, min: 0 },
    exposureNotional: { type: Number, required: true, min: 0 },
    exposureRatio: { type: Number, required: true, min: 0 },
    level: {
      type: String,
      required: true,
      enum: ["極低風險", "偏低風險", "普通風險", "高風險", "極高風險"],
    },
    lastTrade: {
      side: { type: String, enum: ["buy", "sell"] },
      shares: { type: Number, min: 0 },
      price: { type: Number, min: 0 },
      amount: { type: Number, min: 0 },
      fee: { type: Number, min: 0 },
      tax: { type: Number, min: 0 },
      cashChange: { type: Number },
      executedAt: { type: Date },
    },
  },
  { timestamps: true, collection: EXPOSURE_RECORD_COLLECTION },
);

exposureRecordSchema.index({ userId: 1, updatedAt: -1 }, { name: "userId_1_updatedAt_-1" });

export const EXPOSURE_RECORD_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "investment", "cash", "portfolioValue", "exposureNotional", "exposureRatio", "level", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      source: { enum: ["initial", "import"] },
      realizedProfitLoss: { bsonType: ["int", "long", "double", "decimal"] },
      investment: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      holdingShares: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      cash: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      portfolioValue: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      exposureNotional: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      exposureRatio: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      level: { enum: ["極低風險", "偏低風險", "普通風險", "高風險", "極高風險"] },
      lastTrade: {
        bsonType: "object",
        additionalProperties: false,
        properties: {
          side: { enum: ["buy", "sell"] },
          shares: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          price: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          amount: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          fee: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          tax: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          cashChange: { bsonType: ["int", "long", "double", "decimal"] },
          executedAt: { bsonType: "date" },
        },
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
};

export type ExposureRecord = InferSchemaType<typeof exposureRecordSchema>;

export const ExposureRecordModel: Model<ExposureRecord> =
  (models.ExposureRecord as Model<ExposureRecord>) ||
  model<ExposureRecord>("ExposureRecord", exposureRecordSchema);
