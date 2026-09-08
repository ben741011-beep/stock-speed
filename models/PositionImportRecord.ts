import mongoose from "mongoose";
import type { InferSchemaType, Model } from "mongoose";

const { model, models, Schema } = mongoose;

export const POSITION_IMPORT_RECORD_COLLECTION = "positionimportrecords";

const positionImportRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true, immutable: true, index: true },
    exposureRecordId: { type: Schema.Types.ObjectId, ref: "ExposureRecord", required: true, immutable: true, index: true },
    symbol: { type: String, required: true, default: "00631L" },
    holdingShares: { type: Number, required: true, min: 0 },
    costBasis: { type: Number, required: true, min: 0 },
    bookValue: { type: Number, required: true, min: 0 },
    cash: { type: Number, required: true, min: 0 },
    calculatedProfitLossRate: { type: Number, required: true },
    asOfDate: { type: Date, required: true },
  },
  { timestamps: true, collection: POSITION_IMPORT_RECORD_COLLECTION },
);

positionImportRecordSchema.index({ userId: 1, exposureRecordId: 1, createdAt: -1 }, { name: "userId_1_exposureRecordId_1_createdAt_-1" });

const numeric = { bsonType: ["int", "long", "double", "decimal"] };
const nonnegative = { ...numeric, minimum: 0 };

export const POSITION_IMPORT_RECORD_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "exposureRecordId", "symbol", "holdingShares", "costBasis", "bookValue", "cash", "calculatedProfitLossRate", "asOfDate", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      exposureRecordId: { bsonType: "objectId" },
      symbol: { bsonType: "string" },
      holdingShares: nonnegative,
      costBasis: nonnegative,
      bookValue: nonnegative,
      cash: nonnegative,
      calculatedProfitLossRate: numeric,
      asOfDate: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
};

export type PositionImportRecord = InferSchemaType<typeof positionImportRecordSchema>;

export const PositionImportRecordModel: Model<PositionImportRecord> =
  (models.PositionImportRecord as Model<PositionImportRecord>) ||
  model<PositionImportRecord>("PositionImportRecord", positionImportRecordSchema);
