import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";
import { isDeepStrictEqual } from "node:util";

const { model, models, Schema } = mongoose;

export const SPOT_FUTURES_ACCOUNT_COLLECTION = "spotFuturesAccounts";
export const DEFAULT_STOCK_FEE_RATE = 0.001425;
export const DEFAULT_FUTURES_FEE_PER_CONTRACT = 30;
export const DEFAULT_FUTURES_SAFETY_MARGIN_PER_CONTRACT = 35050;

const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const spotFuturesAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true, immutable: true },
    initializationOperationId: { type: String, required: true, immutable: true, match: operationIdPattern },
    initialSecuritiesCash: { type: Number, required: true, min: 0 },
    initialFuturesPrincipal: { type: Number, required: true, min: 0 },
    futuresSafetyMarginPerContract: { type: Number, required: true, min: Number.MIN_VALUE, default: DEFAULT_FUTURES_SAFETY_MARGIN_PER_CONTRACT },
    stockFeeRate: { type: Number, required: true, min: 0, max: 1, default: DEFAULT_STOCK_FEE_RATE },
    futuresFeePerContract: { type: Number, required: true, min: 0, default: DEFAULT_FUTURES_FEE_PER_CONTRACT },
    initializedAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: true, collection: SPOT_FUTURES_ACCOUNT_COLLECTION, autoCreate: false, autoIndex: false },
);

spotFuturesAccountSchema.index({ userId: 1 }, { unique: true, name: "userId_1" });

const numeric = { bsonType: ["int", "long", "double", "decimal"] } as const;
const nonnegative = { ...numeric, minimum: 0 } as const;

export const SPOT_FUTURES_ACCOUNT_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "userId",
      "initializationOperationId",
      "initialSecuritiesCash",
      "initialFuturesPrincipal",
      "futuresSafetyMarginPerContract",
      "stockFeeRate",
      "futuresFeePerContract",
      "initializedAt",
      "createdAt",
      "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      initializationOperationId: {
        bsonType: "string",
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
      },
      initialSecuritiesCash: nonnegative,
      initialFuturesPrincipal: nonnegative,
      futuresSafetyMarginPerContract: { ...nonnegative, exclusiveMinimum: true },
      stockFeeRate: { ...nonnegative, maximum: 1 },
      futuresFeePerContract: nonnegative,
      initializedAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
} as const;

export const SPOT_FUTURES_ACCOUNT_INDEXES = [
  { key: { userId: 1 }, options: { unique: true, name: "userId_1" } },
] as const;

export type SpotFuturesAccount = InferSchemaType<typeof spotFuturesAccountSchema>;
export type StoredSpotFuturesAccount = {
  id: string;
  initialSecuritiesCash: number;
  initialFuturesPrincipal: number;
  futuresSafetyMarginPerContract: number;
  stockFeeRate: number;
  futuresFeePerContract: number;
  initializedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SpotFuturesAccountInput = {
  operationId: string;
  initialSecuritiesCash: number;
  initialFuturesPrincipal: number;
  futuresSafetyMarginPerContract: number;
  futuresFeePerContract: number;
  initializedAt: Date;
};

export type SpotFuturesFundsUpdateInput = {
  securitiesCash: number;
  futuresBalance: number;
};

export const SpotFuturesAccountModel: Model<SpotFuturesAccount> =
  (models.SpotFuturesAccount as Model<SpotFuturesAccount>)
  || model<SpotFuturesAccount>("SpotFuturesAccount", spotFuturesAccountSchema);

function parseNonNegativeNumber(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label}必須是大於或等於 0 的數字。`);
  return parsed;
}

function parsePositiveNumber(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label}必須是大於 0 的數字。`);
  return parsed;
}

function parseDate(value: unknown, label: string) {
  const parsed = typeof value === "string" || value instanceof Date ? new Date(value) : new Date(Number.NaN);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label}格式不正確。`);
  return parsed;
}

export function normalizeOperationId(value: unknown) {
  const operationId = typeof value === "string" ? value.trim() : "";
  if (!operationIdPattern.test(operationId)) throw new Error("操作識別碼格式不正確，請重新整理後再試。");
  return operationId.toLowerCase();
}

export function parseSpotFuturesAccountInput(value: unknown): SpotFuturesAccountInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("初始設定格式不正確。");
  const input = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "operationId",
    "initialSecuritiesCash",
    "initialFuturesPrincipal",
    "futuresSafetyMarginPerContract",
    "futuresFeePerContract",
    "initializedAt",
    "spotOpening",
    "futuresOpenings",
  ]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) throw new Error("初始設定包含不允許的欄位。");
  return {
    operationId: normalizeOperationId(input.operationId),
    initialSecuritiesCash: parseNonNegativeNumber(input.initialSecuritiesCash, "證券現金"),
    initialFuturesPrincipal: parseNonNegativeNumber(input.initialFuturesPrincipal, "期貨配置本金"),
    futuresSafetyMarginPerContract: parsePositiveNumber(input.futuresSafetyMarginPerContract, "微臺每口安全保證金"),
    futuresFeePerContract: parseNonNegativeNumber(input.futuresFeePerContract, "微臺每口手續費"),
    initializedAt: parseDate(input.initializedAt, "起始日期"),
  };
}

export function serializeSpotFuturesAccount(record: {
  _id: Types.ObjectId;
  initialSecuritiesCash: number;
  initialFuturesPrincipal: number;
  futuresSafetyMarginPerContract: number;
  stockFeeRate: number;
  futuresFeePerContract: number;
  initializedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): StoredSpotFuturesAccount {
  return {
    id: record._id.toString(),
    initialSecuritiesCash: record.initialSecuritiesCash,
    initialFuturesPrincipal: record.initialFuturesPrincipal,
    futuresSafetyMarginPerContract: record.futuresSafetyMarginPerContract,
    stockFeeRate: record.stockFeeRate,
    futuresFeePerContract: record.futuresFeePerContract,
    initializedAt: record.initializedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function assertSpotFuturesAccountSchema() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const info = (await database.listCollections({ name: SPOT_FUTURES_ACCOUNT_COLLECTION }).toArray())[0];
  if (!info) throw new Error("0050＋微臺帳戶 collection 尚未完成設定。");
  const options = "options" in info ? info.options : undefined;
  const indexes = await database.collection(SPOT_FUTURES_ACCOUNT_COLLECTION).indexes();
  const userIndex = indexes.find((index) => index.name === "userId_1");
  if (!isDeepStrictEqual(options?.validator, SPOT_FUTURES_ACCOUNT_VALIDATOR)
    || options?.validationLevel !== "strict" || options?.validationAction !== "error"
    || indexes.length !== 2
    || !indexes.some((index) => index.name === "_id_" && isDeepStrictEqual(index.key, { _id: 1 }))
    || !userIndex || !isDeepStrictEqual(userIndex.key, { userId: 1 }) || userIndex.unique !== true
    || userIndex.sparse === true || Boolean(userIndex.partialFilterExpression) || userIndex.expireAfterSeconds !== undefined) {
    throw new Error("0050＋微臺帳戶 collection 的 validator 或索引不符合預期。");
  }
}

export async function createSpotFuturesAccountCollection() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const existing = (await database.listCollections({ name: SPOT_FUTURES_ACCOUNT_COLLECTION }).toArray())[0];
  if (existing) throw new Error("0050＋微臺帳戶 collection 已存在，停止建立以避免覆寫。");
  await database.createCollection(SPOT_FUTURES_ACCOUNT_COLLECTION, {
    validator: SPOT_FUTURES_ACCOUNT_VALIDATOR,
    validationLevel: "strict",
    validationAction: "error",
  });
  const collection = database.collection(SPOT_FUTURES_ACCOUNT_COLLECTION);
  for (const index of SPOT_FUTURES_ACCOUNT_INDEXES) await collection.createIndex(index.key, index.options);
}

export async function getSpotFuturesAccount(userId: string) {
  await assertSpotFuturesAccountSchema();
  const record = await SpotFuturesAccountModel.findOne({ userId }).lean();
  return record ? serializeSpotFuturesAccount(record) : null;
}

export function parseFuturesSafetyMarginUpdate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("安全保證金設定格式不正確。");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || !("futuresSafetyMarginPerContract" in input)) {
    throw new Error("安全保證金設定只能包含每口安全保證金。");
  }
  return parsePositiveNumber(input.futuresSafetyMarginPerContract, "微臺每口安全保證金");
}

export function parseSpotFuturesFundsUpdate(value: unknown): SpotFuturesFundsUpdateInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("資金設定格式不正確。");
  const input = value as Record<string, unknown>;
  const allowedKeys = new Set(["securitiesCash", "futuresBalance"]);
  if (Object.keys(input).length !== allowedKeys.size || Object.keys(input).some((key) => !allowedKeys.has(key))) {
    throw new Error("資金設定只能包含台股現金與期貨保證金資金。");
  }
  return {
    securitiesCash: parseNonNegativeNumber(input.securitiesCash, "台股現金"),
    futuresBalance: parseNonNegativeNumber(input.futuresBalance, "期貨保證金資金"),
  };
}

export async function updateFuturesSafetyMargin(userId: string, futuresSafetyMarginPerContract: number) {
  await assertSpotFuturesAccountSchema();
  const existing = await SpotFuturesAccountModel.findOne({ userId }).select({ _id: 1 }).lean();
  if (!existing) return null;
  const result = await SpotFuturesAccountModel.updateOne(
    { _id: existing._id, userId },
    { $set: { futuresSafetyMarginPerContract, updatedAt: new Date() } },
    { runValidators: true },
  );
  const verified = await SpotFuturesAccountModel.findById(existing._id).lean();
  if (!verified || verified.futuresSafetyMarginPerContract !== futuresSafetyMarginPerContract) {
    throw new Error("安全保證金更新後查回驗證失敗。");
  }
  return {
    account: serializeSpotFuturesAccount(verified),
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}
