export const MICRO_TAIEX_POINT_VALUE = 10;
export const FUTURES_TRANSACTION_TAX_RATE = 0.00002;
export const ETF_SELL_TAX_RATE = 0.001;

export type LedgerInstrument = "0050" | "TMF";
export type LedgerSide = "buy" | "sell";

export type LedgerAccountSettings = {
  initialSecuritiesCash: number;
  initialFuturesPrincipal: number;
  futuresSafetyMarginPerContract: number;
  stockFeeRate: number;
  futuresFeePerContract: number;
};

export type LedgerEvent = {
  kind: "opening" | "trade";
  instrument: LedgerInstrument;
  side: LedgerSide;
  quantity: number;
  price: number;
  contractMonth?: string | null;
  fee: number;
  tax: number;
  cashChange: number;
  realizedProfitLoss: number;
  occurredAt: Date;
};

export type FuturesInventory = {
  contractMonth: string;
  contracts: number;
  averageEntryPoint: number;
};

export type SpotFuturesLedgerState = {
  securitiesCash: number;
  futuresBalance: number;
  spotShares: number;
  spotAverageCost: number;
  futuresPositions: FuturesInventory[];
  realizedProfitLoss: number;
  totalFees: number;
  totalTaxes: number;
  lastOccurredAt: Date | null;
};

export type SpotFuturesFundsTarget = {
  securitiesCash: number;
  futuresBalance: number;
};

export type CalculatedLedgerRow = {
  grossAmount: number;
  fee: number;
  tax: number;
  cashChange: number;
  realizedProfitLoss: number;
  positionQuantityAfter: number;
  averageCostAfter: number;
  fundBalanceAfter: number;
};

type MutableFuturesPosition = { contracts: number; averageEntryPoint: number };

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label}包含無效數字。`);
  return value;
}

export function calculateAdjustedStartingFunds(
  settings: Pick<LedgerAccountSettings, "initialSecuritiesCash" | "initialFuturesPrincipal">,
  state: Pick<SpotFuturesLedgerState, "securitiesCash" | "futuresBalance">,
  target: SpotFuturesFundsTarget,
) {
  finite(target.securitiesCash, "台股現金");
  finite(target.futuresBalance, "期貨保證金資金");
  if (target.securitiesCash < 0 || target.futuresBalance < 0) {
    throw new Error("台股現金與期貨保證金資金不可小於 0。");
  }

  const initialSecuritiesCash = settings.initialSecuritiesCash + target.securitiesCash - state.securitiesCash;
  const initialFuturesPrincipal = settings.initialFuturesPrincipal + target.futuresBalance - state.futuresBalance;
  if (initialSecuritiesCash < 0 || initialFuturesPrincipal < 0) {
    throw new Error("目前交易歷程無法調整到這個金額，請確認輸入值是否正確。");
  }

  return { initialSecuritiesCash, initialFuturesPrincipal };
}

export function calculateStockFee(grossAmount: number, rate: number) {
  finite(grossAmount, "成交金額");
  finite(rate, "股票手續費率");
  return Math.floor(grossAmount * rate + Number.EPSILON);
}

export function calculateEtfSellTax(grossAmount: number) {
  finite(grossAmount, "成交金額");
  return Math.floor(grossAmount * ETF_SELL_TAX_RATE + Number.EPSILON);
}

export function calculateFuturesTax(price: number, contracts: number) {
  finite(price, "微臺成交點位");
  if (!Number.isInteger(contracts) || contracts <= 0) throw new Error("微臺口數必須是大於 0 的整數。");
  return Math.round(price * MICRO_TAIEX_POINT_VALUE * FUTURES_TRANSACTION_TAX_RATE) * contracts;
}

export function calculateLedgerState(settings: LedgerAccountSettings, events: LedgerEvent[]): SpotFuturesLedgerState {
  let securitiesCash = settings.initialSecuritiesCash;
  let futuresBalance = settings.initialFuturesPrincipal;
  let spotShares = 0;
  let spotCostBasis = 0;
  let realizedProfitLoss = 0;
  let totalFees = 0;
  let totalTaxes = 0;
  let lastOccurredAt: Date | null = null;
  const futures = new Map<string, MutableFuturesPosition>();

  for (const event of events) {
    totalFees += event.fee;
    totalTaxes += event.tax;
    realizedProfitLoss += event.realizedProfitLoss;
    lastOccurredAt = event.occurredAt;

    if (event.instrument === "0050") {
      if (event.side === "buy") {
        spotCostBasis += event.kind === "opening"
          ? event.quantity * event.price
          : event.quantity * event.price + event.fee;
        spotShares += event.quantity;
      } else {
        if (event.quantity > spotShares) throw new Error("0050 歷史交易出現賣超，無法彙整庫存。");
        const averageCost = spotShares > 0 ? spotCostBasis / spotShares : 0;
        spotCostBasis = event.quantity === spotShares ? 0 : spotCostBasis - averageCost * event.quantity;
        spotShares -= event.quantity;
      }
      if (event.kind === "trade") securitiesCash += event.cashChange;
      continue;
    }

    const month = event.contractMonth;
    if (!month) throw new Error("微臺歷史交易缺少契約月份。");
    const position = futures.get(month) ?? { contracts: 0, averageEntryPoint: 0 };
    if (event.side === "buy") {
      const nextContracts = position.contracts + event.quantity;
      position.averageEntryPoint = (
        position.averageEntryPoint * position.contracts + event.price * event.quantity
      ) / nextContracts;
      position.contracts = nextContracts;
    } else {
      if (event.quantity > position.contracts) throw new Error(`${month} 微臺歷史交易出現超額平倉。`);
      position.contracts -= event.quantity;
      if (position.contracts === 0) position.averageEntryPoint = 0;
    }
    futures.set(month, position);
    if (event.kind === "trade") futuresBalance += event.cashChange;
  }

  return {
    securitiesCash,
    futuresBalance,
    spotShares,
    spotAverageCost: spotShares > 0 ? spotCostBasis / spotShares : 0,
    futuresPositions: [...futures.entries()]
      .filter(([, position]) => position.contracts > 0)
      .map(([contractMonth, position]) => ({ contractMonth, ...position }))
      .sort((a, b) => a.contractMonth.localeCompare(b.contractMonth)),
    realizedProfitLoss,
    totalFees,
    totalTaxes,
    lastOccurredAt,
  };
}

export function calculateOpeningRow(
  state: SpotFuturesLedgerState,
  input: { instrument: LedgerInstrument; quantity: number; price: number; contractMonth?: string },
): CalculatedLedgerRow {
  if (input.instrument === "0050") {
    const currentCost = state.spotShares * state.spotAverageCost;
    const nextQuantity = state.spotShares + input.quantity;
    return {
      grossAmount: input.quantity * input.price,
      fee: 0,
      tax: 0,
      cashChange: 0,
      realizedProfitLoss: 0,
      positionQuantityAfter: nextQuantity,
      averageCostAfter: (currentCost + input.quantity * input.price) / nextQuantity,
      fundBalanceAfter: state.securitiesCash,
    };
  }
  if (!input.contractMonth) throw new Error("微臺起始庫存缺少契約月份。");
  const current = state.futuresPositions.find((position) => position.contractMonth === input.contractMonth);
  const currentContracts = current?.contracts ?? 0;
  const nextContracts = currentContracts + input.quantity;
  return {
    grossAmount: input.quantity * input.price * MICRO_TAIEX_POINT_VALUE,
    fee: 0,
    tax: 0,
    cashChange: 0,
    realizedProfitLoss: 0,
    positionQuantityAfter: nextContracts,
    averageCostAfter: ((current?.averageEntryPoint ?? 0) * currentContracts + input.price * input.quantity) / nextContracts,
    fundBalanceAfter: state.futuresBalance,
  };
}

export function calculateTradeRow(
  state: SpotFuturesLedgerState,
  settings: LedgerAccountSettings,
  input: { instrument: LedgerInstrument; side: LedgerSide; quantity: number; price: number; contractMonth?: string },
): CalculatedLedgerRow {
  if (input.instrument === "0050") {
    const grossAmount = input.quantity * input.price;
    const fee = calculateStockFee(grossAmount, settings.stockFeeRate);
    const tax = input.side === "sell" ? calculateEtfSellTax(grossAmount) : 0;
    if (input.side === "buy") {
      const cashChange = -(grossAmount + fee);
      if (state.securitiesCash + cashChange < 0) throw new Error("證券現金不足（含手續費），無法買進。");
      const nextQuantity = state.spotShares + input.quantity;
      const nextCost = state.spotShares * state.spotAverageCost + grossAmount + fee;
      return {
        grossAmount, fee, tax, cashChange, realizedProfitLoss: 0,
        positionQuantityAfter: nextQuantity,
        averageCostAfter: nextCost / nextQuantity,
        fundBalanceAfter: state.securitiesCash + cashChange,
      };
    }
    if (input.quantity > state.spotShares) throw new Error(`0050 庫存不足，目前最多可賣 ${state.spotShares.toLocaleString("zh-TW")} 股。`);
    const cashChange = grossAmount - fee - tax;
    const realized = cashChange - state.spotAverageCost * input.quantity;
    const nextQuantity = state.spotShares - input.quantity;
    return {
      grossAmount, fee, tax, cashChange, realizedProfitLoss: realized,
      positionQuantityAfter: nextQuantity,
      averageCostAfter: nextQuantity === 0 ? 0 : state.spotAverageCost,
      fundBalanceAfter: state.securitiesCash + cashChange,
    };
  }

  if (!input.contractMonth) throw new Error("微臺交易缺少契約月份。");
  const current = state.futuresPositions.find((position) => position.contractMonth === input.contractMonth);
  const currentContracts = current?.contracts ?? 0;
  const currentAverage = current?.averageEntryPoint ?? 0;
  const grossAmount = input.quantity * input.price * MICRO_TAIEX_POINT_VALUE;
  const fee = settings.futuresFeePerContract * input.quantity;
  const tax = calculateFuturesTax(input.price, input.quantity);
  if (input.side === "buy") {
    const cashChange = -(fee + tax);
    if (state.futuresBalance + cashChange < 0) throw new Error("期貨配置本金不足以支付手續費與交易稅。");
    const totalContractsAfter = state.futuresPositions.reduce((sum, position) => sum + position.contracts, 0) + input.quantity;
    const requiredSafetyMargin = totalContractsAfter * settings.futuresSafetyMarginPerContract;
    if (state.futuresBalance + cashChange < requiredSafetyMargin) {
      throw new Error(`安全保證金不足；交易後 ${totalContractsAfter.toLocaleString("zh-TW")} 口至少需保留 NT$${requiredSafetyMargin.toLocaleString("zh-TW")}。`);
    }
    const nextQuantity = currentContracts + input.quantity;
    return {
      grossAmount, fee, tax, cashChange, realizedProfitLoss: 0,
      positionQuantityAfter: nextQuantity,
      averageCostAfter: (currentAverage * currentContracts + input.price * input.quantity) / nextQuantity,
      fundBalanceAfter: state.futuresBalance + cashChange,
    };
  }
  if (input.quantity > currentContracts) {
    throw new Error(`${input.contractMonth} 微臺庫存不足，目前最多可平倉 ${currentContracts.toLocaleString("zh-TW")} 口。`);
  }
  const realizedBeforeCosts = (input.price - currentAverage) * MICRO_TAIEX_POINT_VALUE * input.quantity;
  const realized = realizedBeforeCosts - fee - tax;
  const nextQuantity = currentContracts - input.quantity;
  return {
    grossAmount, fee, tax, cashChange: realized, realizedProfitLoss: realized,
    positionQuantityAfter: nextQuantity,
    averageCostAfter: nextQuantity === 0 ? 0 : currentAverage,
    fundBalanceAfter: state.futuresBalance + realized,
  };
}
