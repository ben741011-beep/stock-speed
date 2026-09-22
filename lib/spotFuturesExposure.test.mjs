import assert from "node:assert/strict";
import test from "node:test";
import { calculateSpotFuturesExposure } from "./spotFuturesExposure.ts";

const base = {
  spotShares: 10_000,
  securitiesCash: 100_000,
  futuresPrincipal: 100_000,
  futuresEntryPoint: 20_000,
  spotPrice: 50,
  futuresPrice: 21_000,
};

test("0 口微臺只計算 0050 曝險", () => {
  const result = calculateSpotFuturesExposure({ ...base, futuresContracts: 0 });
  assert.equal(result.futuresNotional, 0);
  assert.equal(result.futuresUnrealizedProfitLoss, 0);
  assert.equal(result.netAssets, 700_000);
});

test("多口微臺計算正損益與名目曝險", () => {
  const result = calculateSpotFuturesExposure({ ...base, futuresContracts: 2 });
  assert.equal(result.futuresNotional, 420_000);
  assert.equal(result.futuresUnrealizedProfitLoss, 20_000);
  assert.equal(result.exposureNotional, 920_000);
  assert.equal(result.netAssets, 720_000);
});

test("微臺下跌時產生負損益", () => {
  const result = calculateSpotFuturesExposure({ ...base, futuresContracts: 1, futuresPrice: 19_000 });
  assert.equal(result.futuresUnrealizedProfitLoss, -10_000);
});

test("曝險比例可以超過 200%", () => {
  const result = calculateSpotFuturesExposure({ ...base, futuresContracts: 10 });
  assert.ok(result.exposureRatio > 200);
});

test("淨資產小於或等於 0 時拒絕計算", () => {
  assert.throws(() => calculateSpotFuturesExposure({
    ...base,
    spotShares: 0,
    securitiesCash: 0,
    futuresPrincipal: 1,
    futuresContracts: 1,
    futuresPrice: 10_000,
  }), /淨資產/);
});

test("非整數口數會被拒絕", () => {
  assert.throws(() => calculateSpotFuturesExposure({ ...base, futuresContracts: 0.5 }), /整數/);
});

test("配置的非數值中繼欄位不會污染試算", () => {
  const result = calculateSpotFuturesExposure({
    ...base,
    futuresContracts: 1,
    id: "configuration-id",
    futuresContractMonth: "202610",
    updatedAt: "2026-09-21T00:00:00.000Z",
  });
  assert.equal(result.futuresNotional, 210_000);
});
