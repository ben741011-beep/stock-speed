import assert from "node:assert/strict";
import test from "node:test";
import { shouldReplaceFuturesQuote } from "./FuturesMarketPrice.ts";

const current = { quoteDate: "2026-09-18", tradingSession: "after-hours", price: 47162 };

test("較舊交易日不可覆蓋目前微臺行情", () => {
  assert.equal(shouldReplaceFuturesQuote(current, {
    quoteDate: "2026-09-17", tradingSession: "after-hours", price: 47000,
  }), false);
});

test("同日一般盤可覆蓋盤後行情", () => {
  assert.equal(shouldReplaceFuturesQuote(current, {
    quoteDate: "2026-09-18", tradingSession: "regular", price: 47421,
  }), true);
});

test("同日盤後行情不可取代一般盤行情", () => {
  assert.equal(shouldReplaceFuturesQuote({
    quoteDate: "2026-09-18", tradingSession: "regular", price: 47421,
  }, current), false);
});

test("較新交易日可取代舊盤後行情", () => {
  assert.equal(shouldReplaceFuturesQuote(current, {
    quoteDate: "2026-09-21", tradingSession: "regular", price: 47500,
  }), true);
});

test("相同日期、盤別及價格不重複更新", () => {
  assert.equal(shouldReplaceFuturesQuote(current, { ...current }), false);
});
