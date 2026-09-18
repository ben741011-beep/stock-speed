import { getStoredStockClosingPrice } from "@/models/StockClosingPrice";
import { getStoredStockIntradayPrice } from "@/models/StockIntradayPrice";

const taipeiDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" });

export async function getStoredMarketValuationPrice(stockCode: string) {
  const [closing, intraday] = await Promise.all([
    getStoredStockClosingPrice(stockCode),
    getStoredStockIntradayPrice(stockCode),
  ]);

  const intradayDate = intraday ? taipeiDate.format(new Date(intraday.quoteAt)) : null;
  const useIntraday = intraday && (!closing || intradayDate! > closing.quoteDate
    || (intradayDate === closing.quoteDate && intraday.fetchedAt >= closing.fetchedAt));

  if (useIntraday) {
    return {
      stockCode: intraday.stockCode,
      price: intraday.price,
      priceType: "intraday" as const,
      quoteDate: intradayDate!,
      quoteAt: intraday.quoteAt,
      fetchedAt: intraday.fetchedAt,
    };
  }
  if (closing) {
    return {
      stockCode: closing.stockCode,
      price: closing.close,
      priceType: "close" as const,
      quoteDate: closing.quoteDate,
      quoteAt: null,
      fetchedAt: closing.fetchedAt,
    };
  }
  return null;
}
