import { InferSchemaType, Model, model, models, Schema } from "mongoose";

const tradeRecordSchema = new Schema(
  {
    exposureRecordId: { type: Schema.Types.ObjectId, ref: "ExposureRecord", required: true, index: true },
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
  { timestamps: true, collection: "traderecords" },
);

export type TradeRecord = InferSchemaType<typeof tradeRecordSchema>;

export const TradeRecordModel: Model<TradeRecord> =
  (models.TradeRecord as Model<TradeRecord>) ||
  model<TradeRecord>("TradeRecord", tradeRecordSchema);
