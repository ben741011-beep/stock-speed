import { InferSchemaType, Model, model, models, Schema } from "mongoose";

const exposureRecordSchema = new Schema(
  {
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
  { timestamps: true },
);

export type ExposureRecord = InferSchemaType<typeof exposureRecordSchema>;

export const ExposureRecordModel: Model<ExposureRecord> =
  (models.ExposureRecord as Model<ExposureRecord>) ||
  model<ExposureRecord>("ExposureRecord", exposureRecordSchema);
