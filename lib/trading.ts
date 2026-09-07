export const BROKER_FEE_RATE = 0.001425;
export const ETF_SELL_TAX_RATE = 0.001;

export function calculateBrokerFee(amount: number) {
  return Math.floor(amount * BROKER_FEE_RATE + Number.EPSILON);
}

export function calculateEtfSellTax(amount: number) {
  return Math.floor(amount * ETF_SELL_TAX_RATE + Number.EPSILON);
}

export function calculateNetMarketValue(grossMarketValue: number) {
  const estimatedSellFee = calculateBrokerFee(grossMarketValue);
  const estimatedSellTax = calculateEtfSellTax(grossMarketValue);

  return {
    grossMarketValue,
    estimatedSellFee,
    estimatedSellTax,
    netMarketValue: grossMarketValue - estimatedSellFee - estimatedSellTax,
  };
}
