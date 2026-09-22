import "server-only";

import { getSpotFuturesRiskLevel } from "@/lib/spotFuturesExposure";
import { getSpotFuturesLedger, type SpotFuturesLedgerSnapshot } from "@/lib/spotFuturesLedger";
import { getStoredFuturesMarketPrice } from "@/models/FuturesMarketPrice";
import { getStoredMarketValuationPrice } from "@/models/MarketValuationPrice";

export type StoredSpotQuote = {
  price: number;
  quoteDate: string;
  quoteTime: string | null;
  priceType: "intraday" | "close";
  fetchedAt: string;
};

export type StoredFuturesQuote = {
  price: number;
  quoteDate: string;
  contractMonth: string;
  tradingSession: "regular" | "after-hours";
  fetchedAt: string;
};

export type SpotFuturesLedgerValuation = {
  spotMarketValue: number;
  spotUnrealizedProfitLoss: number;
  futuresNotional: number;
  futuresUnrealizedProfitLoss: number;
  futuresMarginEquity: number;
  futuresSafetyMarginRequired: number;
  futuresMarginBuffer: number;
  netAssets: number;
  exposureNotional: number;
  exposureRatio: number;
  level: ReturnType<typeof getSpotFuturesRiskLevel>;
};

export type SpotFuturesValuationResponse = {
  ledger: SpotFuturesLedgerSnapshot;
  quotes: { spot: StoredSpotQuote | null; futures: StoredFuturesQuote[] };
  valuation: SpotFuturesLedgerValuation | null;
  missingQuotes: string[];
};

const taipeiTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Taipei",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export async function getStoredSpotFuturesValuation(
  userId: string,
  suppliedLedger?: SpotFuturesLedgerSnapshot | null,
): Promise<SpotFuturesValuationResponse | null> {
  const ledger = suppliedLedger === undefined ? await getSpotFuturesLedger(userId) : suppliedLedger;
  if (!ledger) return null;
  const needsSpotQuote = ledger.inventory.spotShares > 0;
  const months = ledger.inventory.futuresPositions.map((position) => position.contractMonth);
  const [storedSpot, ...storedFutures] = await Promise.all([
    needsSpotQuote ? getStoredMarketValuationPrice("0050") : Promise.resolve(null),
    ...months.map((month) => getStoredFuturesMarketPrice("TMF", month)),
  ]);
  const spot = storedSpot ? {
    price: storedSpot.price,
    quoteDate: storedSpot.quoteDate,
    quoteTime: storedSpot.quoteAt ? taipeiTime.format(new Date(storedSpot.quoteAt)) : null,
    priceType: storedSpot.priceType,
    fetchedAt: storedSpot.fetchedAt,
  } : null;
  const futures = storedFutures.flatMap((quote) => quote ? [{
    price: quote.price,
    quoteDate: quote.quoteDate,
    contractMonth: quote.contractMonth,
    tradingSession: quote.tradingSession,
    fetchedAt: quote.fetchedAt,
  }] : []);
  const missingQuotes: string[] = [];
  if (needsSpotQuote && !spot) missingQuotes.push("0050");
  for (const month of months) {
    if (!futures.some((quote) => quote.contractMonth === month)) missingQuotes.push(`TMF ${month}`);
  }
  if (missingQuotes.length > 0) return { ledger, quotes: { spot, futures }, valuation: null, missingQuotes };

  const spotMarketValue = needsSpotQuote && spot ? ledger.inventory.spotShares * spot.price : 0;
  const spotUnrealizedProfitLoss = needsSpotQuote
    ? spotMarketValue - ledger.inventory.spotShares * ledger.inventory.spotAverageCost
    : 0;
  let futuresNotional = 0;
  let futuresUnrealizedProfitLoss = 0;
  let futuresContracts = 0;
  for (const position of ledger.inventory.futuresPositions) {
    const quote = futures.find((item) => item.contractMonth === position.contractMonth);
    if (!quote) continue;
    futuresNotional += position.contracts * quote.price * 10;
    futuresUnrealizedProfitLoss += position.contracts * (quote.price - position.averageEntryPoint) * 10;
    futuresContracts += position.contracts;
  }
  const futuresMarginEquity = ledger.inventory.futuresBalance + futuresUnrealizedProfitLoss;
  const futuresSafetyMarginRequired = futuresContracts * ledger.account.futuresSafetyMarginPerContract;
  const futuresMarginBuffer = futuresMarginEquity - futuresSafetyMarginRequired;
  const netAssets = spotMarketValue
    + ledger.inventory.securitiesCash
    + ledger.inventory.futuresBalance
    + futuresUnrealizedProfitLoss;
  if (netAssets <= 0) throw new Error("目前淨資產小於或等於 0，無法計算有效曝險比例。");
  const exposureNotional = spotMarketValue + futuresNotional;
  const exposureRatio = (exposureNotional / netAssets) * 100;
  return {
    ledger,
    quotes: { spot, futures },
    valuation: {
      spotMarketValue,
      spotUnrealizedProfitLoss,
      futuresNotional,
      futuresUnrealizedProfitLoss,
      futuresMarginEquity,
      futuresSafetyMarginRequired,
      futuresMarginBuffer,
      netAssets,
      exposureNotional,
      exposureRatio,
      level: getSpotFuturesRiskLevel(exposureRatio),
    },
    missingQuotes,
  };
}
