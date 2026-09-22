import "server-only";

import mongoose, { Types } from "mongoose";
import {
  calculateAdjustedStartingFunds,
  calculateLedgerState,
  calculateOpeningRow,
  calculateTradeRow,
  type LedgerEvent,
  type SpotFuturesLedgerState,
} from "@/lib/spotFuturesLedgerCore";
import {
  assertSpotFuturesAccountSchema,
  DEFAULT_STOCK_FEE_RATE,
  serializeSpotFuturesAccount,
  SpotFuturesAccountModel,
  type SpotFuturesAccountInput,
  type SpotFuturesFundsUpdateInput,
  type StoredSpotFuturesAccount,
} from "@/models/SpotFuturesAccount";
import {
  assertSpotFuturesTransactionSchema,
  serializeSpotFuturesTransaction,
  SpotFuturesTransactionModel,
  type OpeningPositionInput,
  type SpotFuturesTradeInput,
  type StoredSpotFuturesTransaction,
} from "@/models/SpotFuturesTransaction";

type AccountRecord = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  initializationOperationId: string;
  initialSecuritiesCash: number;
  initialFuturesPrincipal: number;
  futuresSafetyMarginPerContract: number;
  stockFeeRate: number;
  futuresFeePerContract: number;
  initializedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionRecord = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  operationId: string;
  sequence: number;
  kind: "opening" | "trade";
  instrument: "0050" | "TMF";
  side: "buy" | "sell";
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
  createdAt: Date;
  updatedAt: Date;
};

export class SpotFuturesLedgerError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type SpotFuturesLedgerSnapshot = {
  account: StoredSpotFuturesAccount;
  inventory: Omit<SpotFuturesLedgerState, "lastOccurredAt"> & { lastOccurredAt: string | null };
  transactions: StoredSpotFuturesTransaction[];
};

function accountSettings(account: AccountRecord) {
  return {
    initialSecuritiesCash: account.initialSecuritiesCash,
    initialFuturesPrincipal: account.initialFuturesPrincipal,
    futuresSafetyMarginPerContract: account.futuresSafetyMarginPerContract,
    stockFeeRate: account.stockFeeRate,
    futuresFeePerContract: account.futuresFeePerContract,
  };
}

function toLedgerEvents(records: TransactionRecord[]): LedgerEvent[] {
  return records.map((record) => ({
    kind: record.kind,
    instrument: record.instrument,
    side: record.side,
    quantity: record.quantity,
    price: record.price,
    contractMonth: record.contractMonth,
    fee: record.fee,
    tax: record.tax,
    cashChange: record.cashChange,
    realizedProfitLoss: record.realizedProfitLoss,
    occurredAt: record.occurredAt,
  }));
}

function snapshot(account: AccountRecord, transactions: TransactionRecord[]): SpotFuturesLedgerSnapshot {
  const state = calculateLedgerState(accountSettings(account), toLedgerEvents(transactions));
  return {
    account: serializeSpotFuturesAccount(account),
    inventory: {
      ...state,
      lastOccurredAt: state.lastOccurredAt?.toISOString() ?? null,
    },
    transactions: [...transactions].reverse().map(serializeSpotFuturesTransaction),
  };
}

async function readRecords(userId: string, session?: mongoose.ClientSession) {
  const accountQuery = SpotFuturesAccountModel.findOne({ userId });
  const transactionsQuery = SpotFuturesTransactionModel.find({ userId }).sort({ occurredAt: 1, _id: 1 });
  if (session) {
    accountQuery.session(session);
    transactionsQuery.session(session);
    const account = await accountQuery.lean();
    const transactions = await transactionsQuery.lean();
    return {
      account: account as AccountRecord | null,
      transactions: transactions as TransactionRecord[],
    };
  }
  const [account, transactions] = await Promise.all([accountQuery.lean(), transactionsQuery.lean()]);
  return {
    account: account as AccountRecord | null,
    transactions: transactions as TransactionRecord[],
  };
}

export async function getSpotFuturesLedger(userId: string): Promise<SpotFuturesLedgerSnapshot | null> {
  await Promise.all([assertSpotFuturesAccountSchema(), assertSpotFuturesTransactionSchema()]);
  const records = await readRecords(userId);
  return records.account ? snapshot(records.account, records.transactions) : null;
}

export async function updateSpotFuturesFunds(userId: string, input: SpotFuturesFundsUpdateInput) {
  await Promise.all([assertSpotFuturesAccountSchema(), assertSpotFuturesTransactionSchema()]);
  const session = await mongoose.startSession();
  let accountId: Types.ObjectId | null = null;
  let matchedCount = 0;
  let modifiedCount = 0;
  try {
    await session.withTransaction(async () => {
      const records = await readRecords(userId, session);
      if (!records.account) throw new SpotFuturesLedgerError("請先完成初始設定。", 404);
      const currentState = calculateLedgerState(accountSettings(records.account), toLedgerEvents(records.transactions));
      const adjusted = calculateAdjustedStartingFunds(accountSettings(records.account), currentState, input);
      accountId = records.account._id;
      if (adjusted.initialSecuritiesCash === records.account.initialSecuritiesCash
        && adjusted.initialFuturesPrincipal === records.account.initialFuturesPrincipal) {
        matchedCount = 1;
        modifiedCount = 0;
        return;
      }
      const result = await SpotFuturesAccountModel.updateOne(
        {
          _id: records.account._id,
          userId,
          initialSecuritiesCash: records.account.initialSecuritiesCash,
          initialFuturesPrincipal: records.account.initialFuturesPrincipal,
        },
        { $set: { ...adjusted, updatedAt: new Date() } },
        { runValidators: true, session },
      );
      matchedCount = result.matchedCount;
      modifiedCount = result.modifiedCount;
      if (result.matchedCount !== 1) throw new SpotFuturesLedgerError("資金已在其他頁面變更，請重新整理後再試。", 409);
    });
  } finally {
    await session.endSession();
  }

  const expectedAccountId = accountId as Types.ObjectId | null;
  if (!expectedAccountId) throw new Error("無法確認資金更新結果。");
  const verifiedRecords = await readRecords(userId);
  if (!verifiedRecords.account || verifiedRecords.account._id.toString() !== expectedAccountId.toString()) {
    throw new Error("資金更新後找不到原帳戶。");
  }
  const ledger = snapshot(verifiedRecords.account, verifiedRecords.transactions);
  if (Math.abs(ledger.inventory.securitiesCash - input.securitiesCash) > 0.000001
    || Math.abs(ledger.inventory.futuresBalance - input.futuresBalance) > 0.000001) {
    throw new Error("資金更新後查回驗證失敗。");
  }
  return { ledger, matchedCount, modifiedCount };
}

function openingDocument(
  userId: string,
  account: AccountRecord,
  operationId: string,
  sequence: number,
  opening: OpeningPositionInput,
  priorEvents: LedgerEvent[],
) {
  const state = calculateLedgerState(accountSettings(account), priorEvents);
  const calculated = calculateOpeningRow(state, opening);
  return {
    userId,
    accountId: account._id,
    operationId,
    sequence,
    kind: "opening" as const,
    instrument: opening.instrument,
    side: "buy" as const,
    quantity: opening.quantity,
    price: opening.price,
    ...(opening.contractMonth ? { contractMonth: opening.contractMonth } : {}),
    ...calculated,
    occurredAt: account.initializedAt,
  };
}

export async function initializeSpotFuturesLedger(
  userId: string,
  input: SpotFuturesAccountInput,
  openings: OpeningPositionInput[],
) {
  await Promise.all([assertSpotFuturesAccountSchema(), assertSpotFuturesTransactionSchema()]);
  const existing = await SpotFuturesAccountModel.findOne({ userId }).lean() as AccountRecord | null;
  if (existing) {
    if (existing.initializationOperationId === input.operationId) {
      const transactions = await SpotFuturesTransactionModel.find({ userId }).sort({ occurredAt: 1, _id: 1 }).lean() as TransactionRecord[];
      return { ledger: snapshot(existing, transactions), idempotent: true, insertedAccountCount: 0, insertedTransactionCount: 0 };
    }
    throw new SpotFuturesLedgerError("已完成初始設定，不能再次建立。", 409);
  }

  const initialFuturesContracts = openings
    .filter((opening) => opening.instrument === "TMF")
    .reduce((sum, opening) => sum + opening.quantity, 0);
  const requiredInitialSafetyMargin = initialFuturesContracts * input.futuresSafetyMarginPerContract;
  if (input.initialFuturesPrincipal < requiredInitialSafetyMargin) {
    throw new SpotFuturesLedgerError(`期貨配置本金不足；${initialFuturesContracts.toLocaleString("zh-TW")} 口微臺至少需保留 NT$${requiredInitialSafetyMargin.toLocaleString("zh-TW")} 安全保證金。`);
  }

  const session = await mongoose.startSession();
  let accountId: Types.ObjectId | null = null;
  const transactionIds: Types.ObjectId[] = [];
  try {
    await session.withTransaction(async () => {
      const [created] = await SpotFuturesAccountModel.create([{
        userId,
        initializationOperationId: input.operationId,
        initialSecuritiesCash: input.initialSecuritiesCash,
        initialFuturesPrincipal: input.initialFuturesPrincipal,
        futuresSafetyMarginPerContract: input.futuresSafetyMarginPerContract,
        stockFeeRate: DEFAULT_STOCK_FEE_RATE,
        futuresFeePerContract: input.futuresFeePerContract,
        initializedAt: input.initializedAt,
      }], { session });
      accountId = created._id;
      const account = created.toObject() as AccountRecord;
      const priorEvents: LedgerEvent[] = [];
      for (const [sequence, opening] of openings.entries()) {
        const document = openingDocument(userId, account, input.operationId, sequence, opening, priorEvents);
        const [transaction] = await SpotFuturesTransactionModel.create([document], { session });
        transactionIds.push(transaction._id);
        priorEvents.push({
          kind: "opening",
          instrument: opening.instrument,
          side: "buy",
          quantity: opening.quantity,
          price: opening.price,
          contractMonth: opening.contractMonth,
          fee: 0,
          tax: 0,
          cashChange: 0,
          realizedProfitLoss: 0,
          occurredAt: input.initializedAt,
        });
      }
    });
  } catch (error) {
    const duplicate = error && typeof error === "object" && "code" in error && error.code === 11000;
    if (!duplicate) throw error;
    const duplicateAccount = await SpotFuturesAccountModel.findOne({ userId }).lean() as AccountRecord | null;
    if (!duplicateAccount || duplicateAccount.initializationOperationId !== input.operationId) throw error;
    const transactions = await SpotFuturesTransactionModel.find({ userId }).sort({ occurredAt: 1, _id: 1 }).lean() as TransactionRecord[];
    return { ledger: snapshot(duplicateAccount, transactions), idempotent: true, insertedAccountCount: 0, insertedTransactionCount: 0 };
  } finally {
    await session.endSession();
  }

  if (!accountId) throw new Error("無法確認初始帳戶寫入結果。");
  const verifiedAccount = await SpotFuturesAccountModel.findById(accountId).lean() as AccountRecord | null;
  if (!verifiedAccount) throw new Error("初始帳戶寫入後查回驗證失敗。");
  const verifiedTransactions = await SpotFuturesTransactionModel.find({ _id: { $in: transactionIds } }).lean();
  if (verifiedTransactions.length !== transactionIds.length) throw new Error("起始庫存寫入後查回驗證失敗。");
  const allTransactions = await SpotFuturesTransactionModel.find({ userId }).sort({ occurredAt: 1, _id: 1 }).lean() as TransactionRecord[];
  return {
    ledger: snapshot(verifiedAccount, allTransactions),
    idempotent: false,
    insertedAccountCount: 1,
    insertedTransactionCount: transactionIds.length,
  };
}

export async function addSpotFuturesTrade(userId: string, input: SpotFuturesTradeInput) {
  await Promise.all([assertSpotFuturesAccountSchema(), assertSpotFuturesTransactionSchema()]);
  const existing = await SpotFuturesTransactionModel.findOne({ userId, operationId: input.operationId, sequence: 0 }).lean() as TransactionRecord | null;
  if (existing) {
    const records = await readRecords(userId);
    if (!records.account) throw new SpotFuturesLedgerError("找不到 0050＋微臺初始設定。", 404);
    return { ledger: snapshot(records.account, records.transactions), transaction: serializeSpotFuturesTransaction(existing), idempotent: true, insertedCount: 0 };
  }

  const session = await mongoose.startSession();
  let transactionId: Types.ObjectId | null = null;
  try {
    await session.withTransaction(async () => {
      const account = await SpotFuturesAccountModel.findOneAndUpdate(
        { userId },
        { $set: { updatedAt: new Date() } },
        { new: true, session },
      ).lean() as AccountRecord | null;
      if (!account) throw new SpotFuturesLedgerError("請先完成初始設定。", 404);
      if (input.occurredAt < account.initializedAt) throw new SpotFuturesLedgerError("成交時間不可早於初始設定時間。");
      const transactions = await SpotFuturesTransactionModel.find({ userId }).sort({ occurredAt: 1, _id: 1 }).session(session).lean() as TransactionRecord[];
      const state = calculateLedgerState(accountSettings(account), toLedgerEvents(transactions));
      if (state.lastOccurredAt && input.occurredAt < state.lastOccurredAt) {
        throw new SpotFuturesLedgerError("成交時間不可早於上一筆交易；第一版帳本依時間順序新增。");
      }
      let calculated;
      try {
        calculated = calculateTradeRow(state, accountSettings(account), input);
      } catch (error) {
        throw new SpotFuturesLedgerError(error instanceof Error ? error.message : "無法計算交易。");
      }
      const [created] = await SpotFuturesTransactionModel.create([{
        userId,
        accountId: account._id,
        operationId: input.operationId,
        sequence: 0,
        kind: "trade",
        instrument: input.instrument,
        side: input.side,
        quantity: input.quantity,
        price: input.price,
        ...(input.contractMonth ? { contractMonth: input.contractMonth } : {}),
        ...calculated,
        occurredAt: input.occurredAt,
      }], { session });
      transactionId = created._id;
    });
  } catch (error) {
    const duplicate = error && typeof error === "object" && "code" in error && error.code === 11000;
    if (!duplicate) throw error;
    const duplicateRecord = await SpotFuturesTransactionModel.findOne({
      userId, operationId: input.operationId, sequence: 0,
    }).lean() as TransactionRecord | null;
    if (!duplicateRecord) throw error;
    const records = await readRecords(userId);
    if (!records.account) throw new Error("重複交易查回後找不到帳戶。");
    return {
      ledger: snapshot(records.account, records.transactions),
      transaction: serializeSpotFuturesTransaction(duplicateRecord),
      idempotent: true,
      insertedCount: 0,
    };
  } finally {
    await session.endSession();
  }

  if (!transactionId) throw new Error("無法確認交易寫入結果。");
  const verified = await SpotFuturesTransactionModel.findById(transactionId).lean() as TransactionRecord | null;
  if (!verified) throw new Error("交易寫入後查回驗證失敗。");
  const records = await readRecords(userId);
  if (!records.account) throw new Error("交易寫入後找不到帳戶。");
  return {
    ledger: snapshot(records.account, records.transactions),
    transaction: serializeSpotFuturesTransaction(verified),
    idempotent: false,
    insertedCount: 1,
  };
}
