import "server-only";
import { parseLatestMicroTaiexQuote, type TaifexDailyRow } from "@/lib/taifexQuoteParsing";

export async function fetchLatestMicroTaiexQuote(contractMonth: string) {
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(contractMonth)) throw new Error("微臺契約月份格式不正確。");
  const response = await fetch("https://openapi.taifex.com.tw/v1/DailyMarketReportFut", {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`期交所行情服務回傳 ${response.status}。`);
  const data = await response.json() as unknown;
  if (!Array.isArray(data)) throw new Error("期交所行情格式不正確。");
  return parseLatestMicroTaiexQuote(data as TaifexDailyRow[], contractMonth);
}
