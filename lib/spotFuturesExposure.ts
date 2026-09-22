export const MICRO_TAIEX_MULTIPLIER = 10;

export type SpotFuturesExposureInput = {
  spotShares: number;
  securitiesCash: number;
  futuresPrincipal: number;
  futuresContracts: number;
  futuresEntryPoint: number;
  spotPrice: number;
  futuresPrice: number;
};

export type SpotFuturesRiskLevel = "極低風險" | "偏低風險" | "普通風險" | "高風險" | "極高風險";

export function getSpotFuturesRiskLevel(exposureRatio: number): SpotFuturesRiskLevel {
  if (exposureRatio <= 50) return "極低風險";
  if (exposureRatio <= 80) return "偏低風險";
  if (exposureRatio <= 120) return "普通風險";
  if (exposureRatio <= 160) return "高風險";
  return "極高風險";
}

export function calculateSpotFuturesExposure(input: SpotFuturesExposureInput) {
  const values = [
    input.spotShares,
    input.securitiesCash,
    input.futuresPrincipal,
    input.futuresContracts,
    input.futuresEntryPoint,
    input.spotPrice,
    input.futuresPrice,
  ];
  if (values.some((value) => !Number.isFinite(value))) throw new Error("曝險試算包含無效數字。");
  if (input.spotShares < 0 || input.securitiesCash < 0 || input.futuresPrincipal < 0 || input.futuresContracts < 0) {
    throw new Error("持股、現金、期貨本金與口數不可小於 0。");
  }
  if (!Number.isInteger(input.spotShares) || !Number.isInteger(input.futuresContracts)) {
    throw new Error("0050 股數與微臺口數必須是整數。");
  }
  if (input.spotPrice <= 0 || input.futuresPrice <= 0 || input.futuresEntryPoint <= 0) {
    throw new Error("行情與進場點位必須大於 0。");
  }

  const spotMarketValue = input.spotShares * input.spotPrice;
  const futuresNotional = input.futuresContracts * input.futuresPrice * MICRO_TAIEX_MULTIPLIER;
  const futuresUnrealizedProfitLoss = input.futuresContracts
    * (input.futuresPrice - input.futuresEntryPoint)
    * MICRO_TAIEX_MULTIPLIER;
  const netAssets = spotMarketValue + input.securitiesCash + input.futuresPrincipal + futuresUnrealizedProfitLoss;
  if (netAssets <= 0) throw new Error("目前淨資產小於或等於 0，無法計算有效曝險比例。");

  const exposureNotional = spotMarketValue + futuresNotional;
  const exposureRatio = (exposureNotional / netAssets) * 100;
  return {
    spotMarketValue,
    futuresNotional,
    futuresUnrealizedProfitLoss,
    netAssets,
    exposureNotional,
    exposureRatio,
    level: getSpotFuturesRiskLevel(exposureRatio),
  };
}
