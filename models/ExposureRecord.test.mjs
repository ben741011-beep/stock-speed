import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAdjustedImportStartingCash,
  parseExposureFundsUpdate,
} from "./ExposureRecordFunds.ts";

test("資金修改只接受目前可用現金", () => {
  assert.deepEqual(parseExposureFundsUpdate({ cash: 250000 }), { cash: 250000 });
  assert.throws(() => parseExposureFundsUpdate({ cash: 1, holdingShares: 2 }), /只能包含目前可用現金/);
  assert.throws(() => parseExposureFundsUpdate({ cash: -1 }), /大於或等於 0/);
});

test("匯入帳本依目前現金差額回推起始現金", () => {
  assert.equal(calculateAdjustedImportStartingCash(100000, 80000, 120000), 140000);
  assert.equal(calculateAdjustedImportStartingCash(100000, 80000, 80000), 100000);
});

test("匯入帳本不允許回推出負的起始現金", () => {
  assert.throws(
    () => calculateAdjustedImportStartingCash(10000, 50000, 0),
    /無法由非負的起始現金表示/,
  );
});
