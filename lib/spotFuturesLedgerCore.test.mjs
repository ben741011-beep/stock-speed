import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./spotFuturesLedgerCore.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const cjsModule = { exports: {} };
const require = createRequire(import.meta.url);
vm.runInNewContext(transpiled, { module: cjsModule, exports: cjsModule.exports, require, console });
const { calculateAdjustedStartingFunds, calculateFuturesTax, calculateLedgerState, calculateOpeningRow, calculateTradeRow } = cjsModule.exports;

const settings = {
  initialSecuritiesCash: 600000,
  initialFuturesPrincipal: 400000,
  futuresSafetyMarginPerContract: 35050,
  stockFeeRate: 0.001425,
  futuresFeePerContract: 30,
};

test("微臺交易稅逐口四捨五入，買進費用會扣除期貨本金", () => {
  const state = calculateLedgerState(settings, []);
  const row = calculateTradeRow(state, settings, {
    instrument: "TMF", side: "buy", quantity: 1, price: 48050, contractMonth: "202610",
  });
  assert.equal(calculateFuturesTax(48050, 1), 10);
  assert.equal(row.fee, 30);
  assert.equal(row.tax, 10);
  assert.equal(row.cashChange, -40);
  assert.equal(row.fundBalanceAfter, 399960);
});

test("48001 與 48050 各一口彙整為兩口，平均 48025.5", () => {
  const empty = calculateLedgerState(settings, []);
  const opening = calculateOpeningRow(empty, {
    instrument: "TMF", quantity: 1, price: 48001, contractMonth: "202610",
  });
  const opened = calculateLedgerState(settings, [{
    kind: "opening", instrument: "TMF", side: "buy", quantity: 1, price: 48001,
    contractMonth: "202610", fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0,
    occurredAt: new Date("2026-09-21T01:00:00Z"),
  }]);
  const trade = calculateTradeRow(opened, settings, {
    instrument: "TMF", side: "buy", quantity: 1, price: 48050, contractMonth: "202610",
  });
  assert.equal(opening.averageCostAfter, 48001);
  assert.equal(trade.positionQuantityAfter, 2);
  assert.equal(trade.averageCostAfter, 48025.5);
});

test("0050 買賣使用 0.1425% 手續費且禁止賣超", () => {
  const opened = calculateLedgerState(settings, [{
    kind: "opening", instrument: "0050", side: "buy", quantity: 5000, price: 100,
    fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0,
    occurredAt: new Date("2026-09-21T01:00:00Z"),
  }]);
  const sell = calculateTradeRow(opened, settings, {
    instrument: "0050", side: "sell", quantity: 4000, price: 110,
  });
  assert.equal(sell.positionQuantityAfter, 1000);
  assert.equal(sell.fee, 627);
  assert.equal(sell.tax, 440);
  assert.equal(sell.realizedProfitLoss, 38933);
  assert.throws(() => calculateTradeRow(opened, settings, {
    instrument: "0050", side: "sell", quantity: 5001, price: 110,
  }), /庫存不足/);
});

test("不同微臺月份分開保存庫存", () => {
  const state = calculateLedgerState(settings, [
    { kind: "opening", instrument: "TMF", side: "buy", quantity: 1, price: 48001, contractMonth: "202610", fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0, occurredAt: new Date("2026-09-21T01:00:00Z") },
    { kind: "opening", instrument: "TMF", side: "buy", quantity: 2, price: 48100, contractMonth: "202611", fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0, occurredAt: new Date("2026-09-21T01:00:00Z") },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(state.futuresPositions)), [
    { contractMonth: "202610", contracts: 1, averageEntryPoint: 48001 },
    { contractMonth: "202611", contracts: 2, averageEntryPoint: 48100 },
  ]);
});

test("微臺加碼會保留每口安全保證金", () => {
  const constrained = { ...settings, initialFuturesPrincipal: 70000 };
  const opened = calculateLedgerState(constrained, [{
    kind: "opening", instrument: "TMF", side: "buy", quantity: 1, price: 48000,
    contractMonth: "202610", fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0,
    occurredAt: new Date("2026-09-21T01:00:00Z"),
  }]);
  assert.throws(() => calculateTradeRow(opened, constrained, {
    instrument: "TMF", side: "buy", quantity: 1, price: 48050, contractMonth: "202610",
  }), /安全保證金不足/);
});

test("微臺平倉即使低於安全門檻仍允許降低風險", () => {
  const constrained = { ...settings, initialFuturesPrincipal: 30000 };
  const opened = calculateLedgerState(constrained, [{
    kind: "opening", instrument: "TMF", side: "buy", quantity: 1, price: 48000,
    contractMonth: "202610", fee: 0, tax: 0, cashChange: 0, realizedProfitLoss: 0,
    occurredAt: new Date("2026-09-21T01:00:00Z"),
  }]);
  const row = calculateTradeRow(opened, constrained, {
    instrument: "TMF", side: "sell", quantity: 1, price: 47000, contractMonth: "202610",
  });
  assert.equal(row.positionQuantityAfter, 0);
});

test("修改目前資金時保留既有交易造成的現金變化", () => {
  const state = { securitiesCash: 450000, futuresBalance: 390000 };
  const adjusted = calculateAdjustedStartingFunds(settings, state, {
    securitiesCash: 500000,
    futuresBalance: 420000,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(adjusted)), {
    initialSecuritiesCash: 650000,
    initialFuturesPrincipal: 430000,
  });
});

test("資金修改拒絕負數與無法由非負起始資金表示的金額", () => {
  const state = { securitiesCash: 700000, futuresBalance: 400000 };
  assert.throws(() => calculateAdjustedStartingFunds(settings, state, {
    securitiesCash: -1,
    futuresBalance: 400000,
  }), /不可小於 0/);
  assert.throws(() => calculateAdjustedStartingFunds(settings, state, {
    securitiesCash: 0,
    futuresBalance: 400000,
  }), /無法調整/);
});
