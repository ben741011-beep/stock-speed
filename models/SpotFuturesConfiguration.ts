import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";
import { isDeepStrictEqual } from "node:util";

const { model, models, Schema } = mongoose;

export const SPOT_FUTURES_CONFIGURATION_COLLECTION = "spotFuturesConfigurations";

const spotFuturesConfigurationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true, immutable: true },
    spotShares: { type: Number, required: true, min: 0, validate: Number.isInteger },
    securitiesCash: { type: Number, required: true, min: 0 },
    futuresPrincipal: { type: Number, required: true, min: 0 },
    futuresContracts: { type: Number, required: true, min: 0, validate: Number.isInteger },
    futuresContractMonth: { type: String, required: true, match: /^\d{4}(0[1-9]|1[0-2])$/ },
    futuresEntryPoint: { type: Number, required: true, min: Number.MIN_VALUE },
  },
  { timestamps: true, collection: SPOT_FUTURES_CONFIGURATION_COLLECTION, autoCreate: false, autoIndex: false },
);

spotFuturesConfigurationSchema.index({ userId: 1 }, { unique: true, name: "userId_1" });

export const SPOT_FUTURES_CONFIGURATION_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "spotShares", "securitiesCash", "futuresPrincipal", "futuresContracts", "futuresContractMonth", "futuresEntryPoint", "createdAt", "updatedAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      spotShares: { bsonType: ["int", "long", "double", "decimal"], minimum: 0, multipleOf: 1 },
      securitiesCash: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      futuresPrincipal: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
      futuresContracts: { bsonType: ["int", "long", "double", "decimal"], minimum: 0, multipleOf: 1 },
      futuresContractMonth: { bsonType: "string", pattern: "^\\d{4}(0[1-9]|1[0-2])$" },
      futuresEntryPoint: { bsonType: ["int", "long", "double", "decimal"], minimum: 0, exclusiveMinimum: true },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
} as const;

export type SpotFuturesConfiguration = InferSchemaType<typeof spotFuturesConfigurationSchema>;
export type SpotFuturesConfigurationInput = {
  spotShares: number;
  securitiesCash: number;
  futuresPrincipal: number;
  futuresContracts: number;
  futuresContractMonth: string;
  futuresEntryPoint: number;
};
export type StoredSpotFuturesConfiguration = SpotFuturesConfigurationInput & { id: string; updatedAt: string };

export const SpotFuturesConfigurationModel: Model<SpotFuturesConfiguration> =
  (models.SpotFuturesConfiguration as Model<SpotFuturesConfiguration>)
  || model<SpotFuturesConfiguration>("SpotFuturesConfiguration", spotFuturesConfigurationSchema);

function parseNonNegativeNumber(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label}必須是大於或等於 0 的數字。`);
  return parsed;
}

function parseNonNegativeInteger(value: unknown, label: string) {
  const parsed = parseNonNegativeNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`${label}必須是整數。`);
  return parsed;
}

export function parseSpotFuturesConfigurationInput(value: unknown): SpotFuturesConfigurationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置格式不正確。");
  const input = value as Record<string, unknown>;
  const allowedKeys = new Set(["spotShares", "securitiesCash", "futuresPrincipal", "futuresContracts", "futuresContractMonth", "futuresEntryPoint"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) throw new Error("配置包含不允許的欄位。");
  const futuresContractMonth = typeof input.futuresContractMonth === "string" ? input.futuresContractMonth.trim() : "";
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(futuresContractMonth)) throw new Error("微臺契約月份必須是 YYYYMM。");
  const futuresEntryPoint = Number(input.futuresEntryPoint);
  if (!Number.isFinite(futuresEntryPoint) || futuresEntryPoint <= 0) throw new Error("微臺進場點位必須大於 0。");
  return {
    spotShares: parseNonNegativeInteger(input.spotShares, "0050 股數"),
    securitiesCash: parseNonNegativeNumber(input.securitiesCash, "證券現金"),
    futuresPrincipal: parseNonNegativeNumber(input.futuresPrincipal, "期貨配置本金"),
    futuresContracts: parseNonNegativeInteger(input.futuresContracts, "微臺口數"),
    futuresContractMonth,
    futuresEntryPoint,
  };
}

function serializeConfiguration(record: {
  _id: Types.ObjectId;
  spotShares: number;
  securitiesCash: number;
  futuresPrincipal: number;
  futuresContracts: number;
  futuresContractMonth: string;
  futuresEntryPoint: number;
  updatedAt: Date;
}): StoredSpotFuturesConfiguration {
  return {
    id: record._id.toString(),
    spotShares: record.spotShares,
    securitiesCash: record.securitiesCash,
    futuresPrincipal: record.futuresPrincipal,
    futuresContracts: record.futuresContracts,
    futuresContractMonth: record.futuresContractMonth,
    futuresEntryPoint: record.futuresEntryPoint,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function assertSpotFuturesConfigurationSchema() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const info = (await database.listCollections({ name: SPOT_FUTURES_CONFIGURATION_COLLECTION }).toArray())[0];
  if (!info) throw new Error("0050＋微臺配置 collection 尚未完成設定。");
  const indexes = await database.collection(SPOT_FUTURES_CONFIGURATION_COLLECTION).indexes();
  const ownerIndex = indexes.find((index) => index.name === "userId_1");
  const options = "options" in info ? info.options : undefined;
  if (!isDeepStrictEqual(options?.validator, SPOT_FUTURES_CONFIGURATION_VALIDATOR)
    || options?.validationLevel !== "strict" || options?.validationAction !== "error"
    || !ownerIndex || !isDeepStrictEqual(ownerIndex.key, { userId: 1 }) || ownerIndex.unique !== true) {
    throw new Error("0050＋微臺配置 collection 的 validator 或索引不符合預期。");
  }
}

export async function getSpotFuturesConfiguration(userId: string) {
  await assertSpotFuturesConfigurationSchema();
  const record = await SpotFuturesConfigurationModel.findOne({ userId }).lean();
  return record ? serializeConfiguration(record) : null;
}

export async function upsertSpotFuturesConfiguration(userId: string, input: SpotFuturesConfigurationInput) {
  await assertSpotFuturesConfigurationSchema();
  const existing = await SpotFuturesConfigurationModel.findOne({ userId }).select({ _id: 1 }).lean();
  const now = new Date();
  const result = await SpotFuturesConfigurationModel.updateOne(
    { userId },
    { $set: { ...input, updatedAt: now }, $setOnInsert: { userId, createdAt: now } },
    { upsert: true, runValidators: true },
  );
  const id = result.upsertedId ?? existing?._id;
  if (!id) throw new Error("無法確認配置儲存結果。");
  const verified = await SpotFuturesConfigurationModel.findById(id).lean();
  if (!verified) throw new Error("配置儲存後查回驗證失敗。");
  return {
    configuration: serializeConfiguration(verified),
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
