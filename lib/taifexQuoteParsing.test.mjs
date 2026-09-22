import assert from "node:assert/strict";
import test from "node:test";
import { parseLatestMicroTaiexQuote } from "./taifexQuoteParsing.ts";

test("同日只採用一般盤結算價，不採最後成交價或夜盤價", () => {
  const quote = parseLatestMicroTaiexQuote([
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202610", Last: "48081", SettlementPrice: "48053", TradingSession: "一般" },
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202610", Last: "47162", SettlementPrice: "47000", TradingSession: "盤後" },
  ], "202610");
  assert.equal(quote.price, 48053);
  assert.equal(quote.tradingSession, "regular");
});

test("排除夜盤、NULL 與其他契約月份", () => {
  const quote = parseLatestMicroTaiexQuote([
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202610", Last: "47162", SettlementPrice: "NULL", TradingSession: "盤後" },
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202611", Last: "48000", SettlementPrice: "47950", TradingSession: "一般" },
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202610", Last: "47421", SettlementPrice: "47400", TradingSession: "一般" },
  ], "202610");
  assert.equal(quote.price, 47400);
  assert.equal(quote.tradingSession, "regular");
});

test("沒有指定月份行情時回報契約可能到期", () => {
  assert.throws(() => parseLatestMicroTaiexQuote([], "202501"), /到期/);
});

test("只有夜盤行情時不回傳價格", () => {
  assert.throws(() => parseLatestMicroTaiexQuote([
    { Date: "20260918", Contract: "TMF", "ContractMonth(Week)": "202610", Last: "47162", SettlementPrice: "47000", TradingSession: "盤後" },
  ], "202610"), /一般盤結算價/);
});
