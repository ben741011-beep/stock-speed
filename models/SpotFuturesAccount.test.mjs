import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./SpotFuturesAccount.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const cjsModule = { exports: {} };
const require = createRequire(import.meta.url);
vm.runInNewContext(transpiled, { module: cjsModule, exports: cjsModule.exports, require, console });
const { parseSpotFuturesFundsUpdate } = cjsModule.exports;

test("資金修改只接受台股現金與期貨保證金資金", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(parseSpotFuturesFundsUpdate({ securitiesCash: 518270, futuresBalance: 902930 }))),
    { securitiesCash: 518270, futuresBalance: 902930 },
  );
  assert.throws(() => parseSpotFuturesFundsUpdate({ securitiesCash: 1 }), /只能包含/);
  assert.throws(() => parseSpotFuturesFundsUpdate({ securitiesCash: 1, futuresBalance: 2, extra: 3 }), /只能包含/);
});

test("資金修改拒絕負數", () => {
  assert.throws(() => parseSpotFuturesFundsUpdate({ securitiesCash: -1, futuresBalance: 0 }), /大於或等於 0/);
  assert.throws(() => parseSpotFuturesFundsUpdate({ securitiesCash: 0, futuresBalance: -1 }), /大於或等於 0/);
});
