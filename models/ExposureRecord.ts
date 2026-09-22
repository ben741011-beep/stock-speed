import mongoose from "mongoose";
import type { InferSchemaType, Model } from "mongoose";
import { getPositionAccounting } from "@/lib/positionAccounting";
import {
  calculateAdjustedImportStartingCash,
  ExposureFundsUpdateError,
  type ExposureFundsUpdateInput,
} from "@/models/ExposureRecordFunds";
import { PositionImportRecordModel } from "@/models/PositionImportRecord";

export {
  ExposureFundsUpdateError,
  parseExposureFundsUpdate,
} from "@/models/ExposureRecordFunds";

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

export async function hasExposureRecord(userId: string) {
  return Boolean(await ExposureRecordModel.exists({ userId }));
}

function getRiskLevel(exposureRatio: number) {
  if (exposureRatio <= 50) return "極低風險";
  if (exposureRatio <= 80) return "偏低風險";
  if (exposureRatio <= 120) return "普通風險";
  if (exposureRatio <= 160) return "高風險";
  return "極高風險";
}

export async function updateExposureFunds(userId: string, input: ExposureFundsUpdateInput) {
  const session = await mongoose.startSession();
  let recordId: mongoose.Types.ObjectId | null = null;
  let matchedCount = 0;
  let modifiedCount = 0;

  try {
    await session.withTransaction(async () => {
      const record = await ExposureRecordModel.findOne({ userId })
        .sort({ updatedAt: -1 })
        .session(session);
      if (!record) throw new ExposureFundsUpdateError("請先完成起始資金設定。", 404);

      recordId = record._id;
      const accounting = await getPositionAccounting(record, userId, session);
      if (Math.abs(accounting.cash - input.cash) <= 0.000001) {
        matchedCount = 1;
        return;
      }

      if (record.source === "import") {
        const importedPosition = await PositionImportRecordModel.findOne({
          userId,
          exposureRecordId: record._id,
        }).sort({ createdAt: -1 }).session(session);
        if (!importedPosition) {
          throw new ExposureFundsUpdateError("找不到匯入帳本的起始資金資料，無法安全更新。", 409);
        }

        const adjustedStartingCash = calculateAdjustedImportStartingCash(
          importedPosition.cash,
          accounting.cash,
          input.cash,
        );
        const importResult = await PositionImportRecordModel.updateOne(
          {
            _id: importedPosition._id,
            userId,
            cash: importedPosition.cash,
            updatedAt: importedPosition.updatedAt,
          },
          { $set: { cash: adjustedStartingCash, updatedAt: new Date() } },
          { runValidators: true, session },
        );
        if (importResult.matchedCount !== 1) {
          throw new ExposureFundsUpdateError("資金已在其他頁面變更，請重新整理後再試。", 409);
        }
      }

      const portfolioValue = accounting.costBasis + input.cash;
      const exposureNotional = accounting.costBasis * 2;
      const exposureRatio = portfolioValue > 0 ? (exposureNotional / portfolioValue) * 100 : 0;
      const updateResult = await ExposureRecordModel.updateOne(
        {
          _id: record._id,
          userId,
          cash: record.cash,
          updatedAt: record.updatedAt,
        },
        {
          $set: {
            cash: input.cash,
            portfolioValue,
            exposureNotional,
            exposureRatio,
            level: getRiskLevel(exposureRatio),
            updatedAt: new Date(),
          },
        },
        { runValidators: true, session },
      );
      matchedCount = updateResult.matchedCount;
      modifiedCount = updateResult.modifiedCount;
      if (updateResult.matchedCount !== 1) {
        throw new ExposureFundsUpdateError("資金已在其他頁面變更，請重新整理後再試。", 409);
      }
    });
  } finally {
    await session.endSession();
  }

  const expectedRecordId = recordId as mongoose.Types.ObjectId | null;
  if (!expectedRecordId) throw new Error("無法確認資金更新結果。");
  const verified = await ExposureRecordModel.findOne({ _id: expectedRecordId, userId }).lean();
  if (!verified) throw new Error("資金更新後找不到原帳本。");
  const accounting = await getPositionAccounting(verified, userId);
  if (Math.abs(accounting.cash - input.cash) > 0.000001) {
    throw new Error("資金更新後查回驗證失敗。");
  }

  return {
    recordId: expectedRecordId.toString(),
    matchedCount,
    modifiedCount,
    cash: accounting.cash,
    investment: accounting.costBasis,
    holdingShares: accounting.holdingShares,
    realizedProfitLoss: accounting.realizedProfitLoss,
  };
}
