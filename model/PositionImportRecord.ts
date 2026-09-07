import { InferSchemaType, Model, model, models, Schema } from "mongoose";

const positionImportRecordSchema = new Schema(
  {
    exposureRecordId: {
      type: Schema.Types.ObjectId,
      ref: "ExposureRecord",
      required: true,
      index: true,
    },
    symbol: { type: String, required: true, default: "00631L" },
    holdingShares: { type: Number, required: true, min: 0 },
    costBasis: { type: Number, required: true, min: 0 },
    bookValue: { type: Number, required: true, min: 0 },
    cash: { type: Number, required: true, min: 0 },
    calculatedProfitLossRate: { type: Number, required: true },
    asOfDate: { type: Date, required: true },
  },
  { timestamps: true, collection: "positionimportrecords" },
);

export type PositionImportRecord = InferSchemaType<typeof positionImportRecordSchema>;

export const PositionImportRecordModel: Model<PositionImportRecord> =
  (models.PositionImportRecord as Model<PositionImportRecord>) ||
  model<PositionImportRecord>("PositionImportRecord", positionImportRecordSchema);
