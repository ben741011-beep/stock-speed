import mongoose from "mongoose";
import type { InferSchemaType, Model, Types } from "mongoose";
import { isDeepStrictEqual } from "node:util";

const { model, models, Schema } = mongoose;

export const SPOT_FUTURES_TRANSACTION_COLLECTION = "spotFuturesTransactions";
export const MICRO_TAIEX_POINT_VALUE = 10;
export const FUTURES_TRANSACTION_TAX_RATE = 0.00002;
export const ETF_SELL_TAX_RATE = 0.001;

const contractMonthPattern = /^\d{4}(0[1-9]|1[0-2])$/;
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const spotFuturesTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "AuthUser", required: true, immutable: true },
    accountId: { type: Schema.Types.ObjectId, ref: "SpotFuturesAccount", required: true, immutable: true },
    operationId: { type: String, required: true, immutable: true },
    sequence: { type: Number, required: true, min: 0, validate: Number.isInteger, immutable: true },
    kind: { type: String, required: true, enum: ["opening", "trade"], immutable: true },
    instrument: { type: String, required: true, enum: ["0050", "TMF"], immutable: true },
    side: { type: String, required: true, enum: ["buy", "sell"], immutable: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger, immutable: true },
    price: { type: Number, required: true, min: Number.MIN_VALUE, immutable: true },
    contractMonth: { type: String, match: contractMonthPattern, immutable: true },
    grossAmount: { type: Number, required: true, min: Number.MIN_VALUE, immutable: true },
    fee: { type: Number, required: true, min: 0, immutable: true },
    tax: { type: Number, required: true, min: 0, immutable: true },
    cashChange: { type: Number, required: true, immutable: true },
    realizedProfitLoss: { type: Number, required: true, immutable: true },
    positionQuantityAfter: { type: Number, required: true, min: 0, validate: Number.isInteger, immutable: true },
    averageCostAfter: { type: Number, required: true, min: 0, immutable: true },
    fundBalanceAfter: { type: Number, required: true, immutable: true },
    occurredAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: true, collection: SPOT_FUTURES_TRANSACTION_COLLECTION, autoCreate: false, autoIndex: false },
);

spotFuturesTransactionSchema.index(
  { userId: 1, operationId: 1, sequence: 1 },
  { unique: true, name: "userId_1_operationId_1_sequence_1" },
);
spotFuturesTransactionSchema.index(
  { userId: 1, occurredAt: 1, _id: 1 },
  { name: "userId_1_occurredAt_1__id_1" },
);
spotFuturesTransactionSchema.index(
  { userId: 1, instrument: 1, contractMonth: 1, occurredAt: 1, _id: 1 },
  { name: "userId_1_instrument_1_contractMonth_1_occurredAt_1__id_1" },
);

const numeric = { bsonType: ["int", "long", "double", "decimal"] } as const;
const nonnegative = { ...numeric, minimum: 0 } as const;
const positive = { ...numeric, minimum: 0, exclusiveMinimum: true } as const;
const integerNonnegative = { ...nonnegative, multipleOf: 1 } as const;
const integerPositive = { ...positive, multipleOf: 1 } as const;

export const SPOT_FUTURES_TRANSACTION_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "userId", "accountId", "operationId", "sequence", "kind", "instrument", "side", "quantity", "price",
      "grossAmount", "fee", "tax", "cashChange", "realizedProfitLoss", "positionQuantityAfter", "averageCostAfter",
      "fundBalanceAfter", "occurredAt", "createdAt", "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      accountId: { bsonType: "objectId" },
      operationId: {
        bsonType: "string",
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
      },
      sequence: integerNonnegative,
      kind: { enum: ["opening", "trade"] },
      instrument: { enum: ["0050", "TMF"] },
      side: { enum: ["buy", "sell"] },
      quantity: integerPositive,
      price: positive,
      contractMonth: { bsonType: "string", pattern: "^\\d{4}(0[1-9]|1[0-2])$" },
      grossAmount: positive,
      fee: nonnegative,
      tax: nonnegative,
      cashChange: numeric,
      realizedProfitLoss: numeric,
      positionQuantityAfter: integerNonnegative,
      averageCostAfter: nonnegative,
      fundBalanceAfter: numeric,
      occurredAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
      __v: { bsonType: "int" },
    },
  },
} as const;

export const SPOT_FUTURES_TRANSACTION_INDEXES = [
  { key: { userId: 1, operationId: 1, sequence: 1 }, options: { unique: true, name: "userId_1_operationId_1_sequence_1" } },
  { key: { userId: 1, occurredAt: 1, _id: 1 }, options: { name: "userId_1_occurredAt_1__id_1" } },
  {
    key: { userId: 1, instrument: 1, contractMonth: 1, occurredAt: 1, _id: 1 },
    options: { name: "userId_1_instrument_1_contractMonth_1_occurredAt_1__id_1" },
  },
] as const;

export type SpotFuturesTransaction = InferSchemaType<typeof spotFuturesTransactionSchema>;
export type SpotFuturesInstrument = "0050" | "TMF";
export type SpotFuturesTradeSide = "buy" | "sell";
export type OpeningPositionInput = {
  instrument: SpotFuturesInstrument;
  quantity: number;
  price: number;
  contractMonth?: string;
};
export type SpotFuturesTradeInput = OpeningPositionInput & {
  operationId: string;
  side: SpotFuturesTradeSide;
  occurredAt: Date;
};
export type StoredSpotFuturesTransaction = {
  id: string;
  kind: "opening" | "trade";
  instrument: SpotFuturesInstrument;
  side: SpotFuturesTradeSide;
  quantity: number;
  price: number;
  contractMonth: string | null;
  grossAmount: number;
  fee: number;
  tax: number;
  cashChange: number;
  realizedProfitLoss: number;
  positionQuantityAfter: number;
  averageCostAfter: number;
  fundBalanceAfter: number;
  occurredAt: string;
};

export const SpotFuturesTransactionModel: Model<SpotFuturesTransaction> =
  (models.SpotFuturesTransaction as Model<SpotFuturesTransaction>)
  || model<SpotFuturesTransaction>("SpotFuturesTransaction", spotFuturesTransactionSchema);

function parsePositiveInteger(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label}必須是大於 0 的整數。`);
  return parsed;
}

function parsePositiveNumber(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label}必須是大於 0 的數字。`);
  return parsed;
}

function parseContractMonth(value: unknown, required: boolean) {
  const contractMonth = typeof value === "string" ? value.trim().replace("-", "") : "";
  if (!contractMonth && !required) return undefined;
  if (!contractMonthPattern.test(contractMonth)) throw new Error("微臺契約月份必須是 YYYYMM。");
  return contractMonth;
}

export function parseOpeningPosition(value: unknown): OpeningPositionInput | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("起始庫存格式不正確。");
  const input = value as Record<string, unknown>;
  const allowed = new Set(["instrument", "quantity", "price", "contractMonth"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("起始庫存包含不允許的欄位。");
  const instrument = input.instrument;
  if (instrument !== "0050" && instrument !== "TMF") throw new Error("起始庫存商品不正確。");
  const contractMonth = parseContractMonth(input.contractMonth, instrument === "TMF");
  if (instrument === "0050" && input.contractMonth !== undefined && input.contractMonth !== "") {
    throw new Error("0050 起始庫存不可包含契約月份。");
  }
  return {
    instrument,
    quantity: parsePositiveInteger(input.quantity, instrument === "0050" ? "0050 股數" : "微臺口數"),
    price: parsePositiveNumber(input.price, instrument === "0050" ? "0050 平均成本" : "微臺進場點位"),
    ...(contractMonth ? { contractMonth } : {}),
  };
}

export function parseOpeningPositionsFromInitialization(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("初始設定格式不正確。");
  const input = value as Record<string, unknown>;
  const spotOpening = parseOpeningPosition(input.spotOpening);
  if (spotOpening && spotOpening.instrument !== "0050") throw new Error("0050 起始庫存商品不正確。");
  const rawFutures = input.futuresOpenings;
  if (!Array.isArray(rawFutures)) throw new Error("微臺起始庫存必須是陣列。");
  if (rawFutures.length > 24) throw new Error("微臺起始庫存最多可輸入 24 筆。");
  const futuresOpenings = rawFutures.map((item) => {
    const parsed = parseOpeningPosition(item);
    if (!parsed || parsed.instrument !== "TMF") throw new Error("微臺起始庫存商品不正確。");
    return parsed;
  });
  return [...(spotOpening ? [spotOpening] : []), ...futuresOpenings];
}

export function parseSpotFuturesTradeInput(value: unknown): SpotFuturesTradeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("交易格式不正確。");
  const input = value as Record<string, unknown>;
  const allowed = new Set(["operationId", "instrument", "side", "quantity", "price", "contractMonth", "occurredAt"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("交易包含不允許的欄位。");
  const instrument = input.instrument;
  if (instrument !== "0050" && instrument !== "TMF") throw new Error("交易商品不正確。");
  const side = input.side;
  if (side !== "buy" && side !== "sell") throw new Error("交易方向必須是買進或賣出。");
  const occurredAt = typeof input.occurredAt === "string" ? new Date(input.occurredAt) : new Date(Number.NaN);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("成交時間格式不正確。");
  const contractMonth = parseContractMonth(input.contractMonth, instrument === "TMF");
  if (instrument === "0050" && input.contractMonth !== undefined && input.contractMonth !== "") {
    throw new Error("0050 交易不可包含契約月份。");
  }
  return {
    operationId: parseOperationId(input.operationId),
    instrument,
    side,
    quantity: parsePositiveInteger(input.quantity, instrument === "0050" ? "0050 股數" : "微臺口數"),
    price: parsePositiveNumber(input.price, instrument === "0050" ? "0050 成交價" : "微臺成交點位"),
    occurredAt,
    ...(contractMonth ? { contractMonth } : {}),
  };
}

function parseOperationId(value: unknown) {
  const operationId = typeof value === "string" ? value.trim() : "";
  if (!operationIdPattern.test(operationId)) throw new Error("操作識別碼格式不正確，請重新整理後再試。");
  return operationId.toLowerCase();
}

export function serializeSpotFuturesTransaction(record: {
  _id: Types.ObjectId;
  kind: "opening" | "trade";
  instrument: SpotFuturesInstrument;
  side: SpotFuturesTradeSide;
  quantity: number;
  price: number;
  contractMonth?: string | null;
  grossAmount: number;
  fee: number;
  tax: number;
  cashChange: number;
  realizedProfitLoss: number;
  positionQuantityAfter: number;
  averageCostAfter: number;
  fundBalanceAfter: number;
  occurredAt: Date;
}): StoredSpotFuturesTransaction {
  return {
    id: record._id.toString(),
    kind: record.kind,
    instrument: record.instrument,
    side: record.side,
    quantity: record.quantity,
    price: record.price,
    contractMonth: record.contractMonth ?? null,
    grossAmount: record.grossAmount,
    fee: record.fee,
    tax: record.tax,
    cashChange: record.cashChange,
    realizedProfitLoss: record.realizedProfitLoss,
    positionQuantityAfter: record.positionQuantityAfter,
    averageCostAfter: record.averageCostAfter,
    fundBalanceAfter: record.fundBalanceAfter,
    occurredAt: record.occurredAt.toISOString(),
  };
}

export async function assertSpotFuturesTransactionSchema() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const info = (await database.listCollections({ name: SPOT_FUTURES_TRANSACTION_COLLECTION }).toArray())[0];
  if (!info) throw new Error("0050＋微臺交易 collection 尚未完成設定。");
  const options = "options" in info ? info.options : undefined;
  const indexes = await database.collection(SPOT_FUTURES_TRANSACTION_COLLECTION).indexes();
  const matches = SPOT_FUTURES_TRANSACTION_INDEXES.every(({ key, options: expected }) => {
    const actual = indexes.find((index) => index.name === expected.name);
    return actual && isDeepStrictEqual(actual.key, key)
      && Boolean(actual.unique) === Boolean("unique" in expected && expected.unique)
      && actual.sparse !== true && !actual.partialFilterExpression && actual.expireAfterSeconds === undefined;
  });
  if (!isDeepStrictEqual(options?.validator, SPOT_FUTURES_TRANSACTION_VALIDATOR)
    || options?.validationLevel !== "strict" || options?.validationAction !== "error"
    || indexes.length !== SPOT_FUTURES_TRANSACTION_INDEXES.length + 1
    || !indexes.some((index) => index.name === "_id_" && isDeepStrictEqual(index.key, { _id: 1 }))
    || !matches) {
    throw new Error("0050＋微臺交易 collection 的 validator 或索引不符合預期。");
  }
}

export async function createSpotFuturesTransactionCollection() {
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB 尚未連線。");
  const existing = (await database.listCollections({ name: SPOT_FUTURES_TRANSACTION_COLLECTION }).toArray())[0];
  if (existing) throw new Error("0050＋微臺交易 collection 已存在，停止建立以避免覆寫。");
  await database.createCollection(SPOT_FUTURES_TRANSACTION_COLLECTION, {
    validator: SPOT_FUTURES_TRANSACTION_VALIDATOR,
    validationLevel: "strict",
    validationAction: "error",
  });
  const collection = database.collection(SPOT_FUTURES_TRANSACTION_COLLECTION);
  for (const index of SPOT_FUTURES_TRANSACTION_INDEXES) await collection.createIndex(index.key, index.options);
}
