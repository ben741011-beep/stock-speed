export type TaifexDailyRow = {
  Date?: string;
  Contract?: string;
  "ContractMonth(Week)"?: string;
  Last?: string;
  SettlementPrice?: string;
  TradingSession?: string;
};

function parsePositiveNumber(value?: string) {
  if (!value || value === "NULL" || value === "-") return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toIsoDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function parseLatestMicroTaiexQuote(rows: TaifexDailyRow[], contractMonth: string) {
  const matches = rows
    .map((row) => ({
      row,
      price: parsePositiveNumber(row.SettlementPrice),
    }))
    .filter(({ row, price }) => row.Contract === "TMF"
      && row["ContractMonth(Week)"] === contractMonth
      && row.TradingSession === "一般"
      && /^\d{8}$/.test(row.Date ?? "")
      && price !== null)
    .sort((left, right) => right.row.Date!.localeCompare(left.row.Date!));

  const latest = matches[0];
  if (!latest?.price || !latest.row.Date) {
    throw new Error(`期交所目前沒有 ${contractMonth} 微臺契約的一般盤結算價，請確認契約是否已到期。`);
  }

  return {
    symbol: "TMF",
    contractMonth,
    price: latest.price,
    quoteDate: toIsoDate(latest.row.Date),
    tradingSession: "regular" as const,
  };
}
