import type { ClientSession, Types } from "mongoose";
import { getHoldingShares } from "@/lib/exposure";
import { calculateBrokerFee, calculateEtfSellTax } from "@/lib/trading";
import { PositionImportRecordModel } from "@/model/PositionImportRecord";
import { TradeRecordModel } from "@/model/TradeRecord";

type AccountingRecord = {
  _id: Types.ObjectId;
  source?: string | null;
  investment: number;
  cash: number;
  holdingShares?: number | null;
  realizedProfitLoss?: number | null;
  lastTrade?: {
    side?: string | null;
    shares?: number | null;
  } | null;
};

export async function getPositionAccounting(
  record: AccountingRecord,
  session?: ClientSession,
) {
  if (record.source !== "import") {
    return {
      costBasis: record.investment,
      cash: record.cash,
      holdingShares: getHoldingShares(record),
      realizedProfitLoss: record.realizedProfitLoss ?? 0,
      importedBookValue: null,
      importedAsOfDate: null,
      tradeCount: 0,
    };
  }

  const importQuery = PositionImportRecordModel.findOne({
    exposureRecordId: record._id,
  }).sort({ createdAt: -1 });
  if (session) importQuery.session(session);
  const importedPosition = await importQuery.lean();

  if (!importedPosition) {
    return {
      costBasis: record.investment,
      cash: record.cash,
      holdingShares: getHoldingShares(record),
      realizedProfitLoss: record.realizedProfitLoss ?? 0,
      importedBookValue: null,
      importedAsOfDate: null,
      tradeCount: 0,
    };
  }

  const tradeQuery = TradeRecordModel.find({
    exposureRecordId: record._id,
  }).sort({ createdAt: 1, _id: 1 });
  if (session) tradeQuery.session(session);
  const trades = await tradeQuery.lean();

  let costBasis = importedPosition.costBasis;
  let cash = importedPosition.cash;
  let holdingShares = importedPosition.holdingShares;
  let realizedProfitLoss = 0;

  for (const trade of trades) {
    const fee = calculateBrokerFee(trade.amount);

    if (trade.side === "buy") {
      costBasis += trade.amount + fee;
      cash -= trade.amount + fee;
      holdingShares += trade.shares;
      continue;
    }

    const sellTax = calculateEtfSellTax(trade.amount);
    const costBasisReduction = holdingShares > 0
      ? costBasis * Math.min(trade.shares / holdingShares, 1)
      : 0;

    realizedProfitLoss += trade.amount - fee - sellTax - costBasisReduction;
    costBasis = Math.max(0, costBasis - costBasisReduction);
    cash += trade.amount - fee - sellTax;
    holdingShares = Math.max(0, holdingShares - trade.shares);
  }

  return {
    costBasis,
    cash,
    holdingShares,
    realizedProfitLoss,
    importedBookValue: importedPosition.bookValue,
    importedAsOfDate: importedPosition.asOfDate,
    tradeCount: trades.length,
  };
}
