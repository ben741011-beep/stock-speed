# 00631L 盤中價格快照提案

狀態：2026-09-18 已建立並查回驗證資料庫 schema；尚未寫入任何盤中價格。

## 唯讀盤點（2026-09-18）

- 目標 database：`stock-speed`。
- 既有 `stockClosingPrices`：1 筆；`validator` 與 `models/StockClosingPrice.ts` 相同，`validationLevel: strict`、`validationAction: error`，索引為 `_id_` 與 `stockCode_1`（唯一）。抽樣文件使用 `stockCode` 字串、`close` 數字，以及 `quoteDate`、`fetchedAt`、`createdAt`、`updatedAt` 日期。
- `stockIntradayPrices`：不存在；預計新建後初始筆數為 0。沒有舊盤中資料需要轉換。

## 新 collection

名稱：`stockIntradayPrices`。每個股票代碼保留一筆最近一次手動取得的盤中成交價快照。資料來自證交所 MIS 最近成交資訊。交易日點擊按鈕時才更新；一般儀表板與行情 GET 只讀 MongoDB。盤中快照與正式收盤價分開存放，方便顯示資料來源並避免改寫既有收盤紀錄。

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `_id` | `ObjectId` / objectId | MongoDB 產生，必填 |
| `stockCode` | `string` / string | 必填，4–10 字元；股票代碼，固定不變 |
| `price` | `number` / int、long、double 或 decimal | 必填，> 0；MIS `trade.z`，無值時才用 `z` |
| `quoteAt` | `Date` / date | 必填；MIS 交易日期 `d` 與最近成交時間 `trade.t` 組合，台北時間 |
| `fetchedAt` | `Date` / date | 必填；本服務取價及儲存時間 |
| `createdAt` | `Date` / date | 必填；首次儲存時間 |
| `updatedAt` | `Date` / date | 必填；最後修改時間 |
| `__v` | `number` / int | Mongoose 可選版本欄位 |

所有必填欄位不接受 `null` 或缺漏；`price` 不接受 0；字串不接受空值。`additionalProperties: false`。以 `{ stockCode: 1 }` 唯一索引支援單一代碼讀取與 upsert；另有 MongoDB 自動建立的 `_id_` 索引。沒有外鍵、個資或租戶專屬資料。每代碼只有一筆，文件大小固定，遠低於 16 MB。重取相同或更舊的成交時間時略過更新；較新的成交時間覆寫同代碼快照。沒有 TTL；保留最近一次快照，畫面顯示成交時間，避免被誤認為持續即時報價。

範例文件（示意，不代表實際行情；兩筆代表不同時間的獨立狀態，不會同時存在）：

```js
{ _id: ObjectId("000000000000000000000001"), stockCode: "00631L", price: 37.41,
  quoteAt: ISODate("2026-09-18T04:04:03Z"), fetchedAt: ISODate("2026-09-18T04:04:50Z"),
  createdAt: ISODate("2026-09-18T04:04:50Z"), updatedAt: ISODate("2026-09-18T04:04:50Z") }
{ _id: ObjectId("000000000000000000000001"), stockCode: "00631L", price: 37.43,
  quoteAt: ISODate("2026-09-18T04:05:39Z"), fetchedAt: ISODate("2026-09-18T04:06:00Z"),
  createdAt: ISODate("2026-09-18T04:04:50Z"), updatedAt: ISODate("2026-09-18T04:06:00Z") }
```

## 已核准並完成的資料庫變更

已在 `stock-speed` 建立 `stockIntradayPrices`，使用 `models/StockIntradayPrice.ts` 的 `STOCK_INTRADAY_PRICE_VALIDATOR` 作為完整 validator，並設定 `validationLevel: "strict"`、`validationAction: "error"`；建立 `{ stockCode: 1 }`、`unique: true`、名稱 `stockCode_1` 的索引。執行前重新唯讀比對，目標 collection 不存在，既有 `stockClosingPrices` 的 validator、設定、完整索引、筆數與樣本均符合原盤點。

建立後唯讀查回：新 collection 的 validator 與 model 完全相符，`validationLevel: strict`、`validationAction: error`，索引為 `_id_` 與唯一的 `stockCode_1`；新 collection 為 **0 筆**，既有 `stockClosingPrices` 仍為 **1 筆**。本次新增、更新、刪除的價格文件皆為 **0 筆**，既有 collection 未修改。

首次真正的盤中價格寫入由使用者之後在交易日點擊按鈕觸發；會以 `stockCode: "00631L"` 取得或更新至多一筆，並由 model 用 `_id` 查回。若初次寫入失敗，先查明實際持久化結果，再決定是否重試。日後如需回復，先停止新 API 使用並檢查盤中快照；不自動刪除 collection 或文件。

---

# 0050＋微臺目前配置提案

狀態：2026-09-21 已由使用者核准資料結構，並完成 schema-only 建立與查回驗證；未建立任何配置文件。

## 唯讀盤點（2026-09-21）

- 目標 database：`stock-speed`。
- 既有 collections：`stockIntradayPrices` 1 筆、`traderecords` 4 筆、`authusers` 1 筆、`exposurerecords` 1 筆、`stockClosingPrices` 1 筆、`positionimportrecords` 1 筆。
- 既有 collections 皆使用 `validationLevel: strict`、`validationAction: error`；租戶資料以 `userId: ObjectId` 隔離。
- `spotFuturesConfigurations` 不存在，初始文件數預計為 0；沒有既有資料需要轉換。

## 新 collection

名稱：`spotFuturesConfigurations`。每位使用者只保留一筆目前配置；行情另存為全站共用的市場快照，衍生曝險數字不保存。

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `_id` | `ObjectId` / objectId | MongoDB 產生 |
| `userId` | `ObjectId` / objectId | 必填、不可變；由伺服器登入狀態提供 |
| `spotShares` | `number` / numeric | 必填、整數、>= 0；使用者輸入的 0050 股數 |
| `securitiesCash` | `number` / numeric | 必填、>= 0；使用者輸入的證券帳戶現金 |
| `futuresPrincipal` | `number` / numeric | 必填、>= 0；不含本頁另算損益的期貨配置本金 |
| `futuresContracts` | `number` / numeric | 必填、整數、>= 0；做多 TMF 口數 |
| `futuresContractMonth` | `string` / string | 必填；`YYYYMM`，月份須為 01–12 |
| `futuresEntryPoint` | `number` / numeric | 必填、> 0；使用者輸入的進場點位 |
| `createdAt`、`updatedAt` | `Date` / date | 必填；Mongoose timestamps |
| `__v` | `number` / int | Mongoose 可選版本欄位 |

所有業務欄位不接受 `null`、缺漏或空字串；金額與股數的 0 代表確實沒有該項資產，不等同缺漏。`additionalProperties: false`。唯一索引 `{ userId: 1 }` 支援每位使用者一筆配置以及冪等 upsert；所有讀寫均由伺服器 session 取得 `userId`，忽略並拒絕客戶端額外欄位。沒有 TTL，配置保留到使用者主動更新。文件固定大小，遠低於 16 MB。

示意文件（不代表實際帳戶資料）：

```js
{ _id: ObjectId("000000000000000000000011"), userId: ObjectId("000000000000000000000101"),
  spotShares: 10000, securitiesCash: 100000, futuresPrincipal: 100000,
  futuresContracts: 1, futuresContractMonth: "202610", futuresEntryPoint: 47000,
  createdAt: ISODate("2026-09-21T00:00:00Z"), updatedAt: ISODate("2026-09-21T00:00:00Z") }
{ _id: ObjectId("000000000000000000000012"), userId: ObjectId("000000000000000000000102"),
  spotShares: 5000, securitiesCash: 250000, futuresPrincipal: 50000,
  futuresContracts: 0, futuresContractMonth: "202611", futuresEntryPoint: 47500,
  createdAt: ISODate("2026-09-21T00:00:00Z"), updatedAt: ISODate("2026-09-21T00:00:00Z") }
```

schema-only 建立不會新增使用者配置。首次真正寫入由登入使用者按「儲存目前配置」觸發，以 `{ userId }` upsert 並用 `_id` 查回；相同輸入重送只會匹配同一文件，不會新增第二筆。未來若擴充空單、交易歷史或每日結算基準，先新增獨立提案與相容遷移，不在現有文件中混入未設計欄位。

## 已核准並完成的資料庫變更

建立前重新唯讀確認目標 collection 不存在；既有 collection 文件數為 `stockIntradayPrices` 1、`traderecords` 4、`authusers` 1、`exposurerecords` 1、`stockClosingPrices` 1、`positionimportrecords` 1。建立 `spotFuturesConfigurations` 後查回確認 validator 與 `models/SpotFuturesConfiguration.ts` 完全相符，設定為 `validationLevel: strict`、`validationAction: error`，索引為 `_id_` 與唯一的 `userId_1`。

新 collection 最終為 **0 筆**；既有六個 collections 的文件數均未改變。本次配置文件新增 0、更新 0、刪除 0。首次真正配置寫入仍由使用者登入後在頁面主動按下儲存按鈕觸發。

---

# 0050＋微臺行情快照擴充

狀態：2026-09-21 已建立並查回驗證 `futuresMarketPrices` schema，且完成首次手動行情更新與冪等重跑驗證。

0050 沿用既有的 `stockIntradayPrices` 與 `stockClosingPrices`，以 `stockCode: "0050"` 保存盤中成交價或最近正式收盤價。微臺行情新增全站共用的 `futuresMarketPrices`；每個契約月份只保留最新快照，不保存歷史序列，也不重複寫入個別使用者配置。

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `_id` | `ObjectId` / objectId | MongoDB 產生 |
| `symbol` | `"TMF"` / string | 必填、不可變 |
| `contractMonth` | `string` / string | 必填、不可變；`YYYYMM` |
| `price` | `number` / numeric | 必填、> 0；期交所每日行情有效最後成交價 |
| `quoteDate` | `Date` / date | 必填；官方交易日期，以 UTC 午夜保存日期值 |
| `tradingSession` | `"regular"` 或 `"after-hours"` / string | 必填；同日優先盤後 |
| `fetchedAt` | `Date` / date | 必填；本服務取得並處理行情的時間 |
| `createdAt`、`updatedAt` | `Date` / date | 必填；文件生命週期時間 |
| `__v` | `number` / int | Mongoose 可選版本欄位 |

所有欄位不接受 `null`；`additionalProperties: false`，`validationLevel: strict`、`validationAction: error`。唯一索引 `{ symbol: 1, contractMonth: 1 }`，名稱 `symbol_1_contractMonth_1`。同一月份收到較舊日期，或同日一般盤企圖覆蓋盤後資料時略過；同日同盤別的新值可以更新。沒有 TTL，文件固定大小且遠低於 16 MB。

示意文件（不代表實際行情）：

```js
{ _id: ObjectId("000000000000000000000021"), symbol: "TMF", contractMonth: "202610",
  price: 47000, quoteDate: ISODate("2026-09-21T00:00:00Z"), tradingSession: "after-hours",
  fetchedAt: ISODate("2026-09-21T07:00:00Z"), createdAt: ISODate("2026-09-21T07:00:00Z"),
  updatedAt: ISODate("2026-09-21T07:00:00Z") }
```

按鈕更新會讓 0050 與 TMF 各自寫入成功；若其中一個來源失敗，另一個仍可保存。時速表只在資料庫已有兩筆必要行情時顯示，並揭露各自日期。建立 collection 的 schema-only 操作不得新增行情文件或修改既有 collection 文件。

## 已核准並完成的資料庫變更

建立前唯讀 drift check 確認 `futuresMarketPrices` 不存在，`stockIntradayPrices`、`stockClosingPrices` 與 `spotFuturesConfigurations` 的完整 validator、strict/error 設定、唯一索引及文件數皆符合程式模型。建立後查回確認新 collection 的 validator 完全相符，索引為 `_id_` 與唯一的 `symbol_1_contractMonth_1`，初始 0 筆；既有七個 collections 的文件數均未變動。

首次受保護 API 更新新增一筆 `stockCode: "0050"` 的盤中行情，以及一筆 `symbol: "TMF"`、`contractMonth: "202610"` 的期貨行情，兩筆皆以 `_id` 查回驗證。相同來源資料重跑時兩筆皆為 matched 1、modified 0、upserted 0，精確目標文件數仍各為 1；沒有新增重複快照。

---

# 0050＋微臺初始庫存與交易帳本提案

狀態：2026-09-21 已由使用者核准 schema，完成 schema-only 建立與查回驗證；尚未建立任何帳戶或交易文件。

## 唯讀盤點（2026-09-21）

- 目標 database：`stock-speed`。
- `spotFuturesConfigurations` 已存在但為 **0 筆**，validator 為 `strict/error`，唯一索引為 `{ userId: 1 }`；保留但新帳本不再寫入，不刪除也不修改。
- `spotFuturesAccounts` 與 `spotFuturesTransactions` 均不存在。
- 全站共用行情繼續使用 `stockIntradayPrices`、`stockClosingPrices` 與 `futuresMarketPrices`；此次不修改其 validator、索引或既有行情文件。
- 目前 `futuresMarketPrices` 1 筆、`stockIntradayPrices` 2 筆、`stockClosingPrices` 1 筆；完整 validator、`strict/error` 設定與唯一索引均已唯讀查回。

## 新 collection：`spotFuturesAccounts`

每位使用者一筆帳本設定與起始資金。持倉不直接覆寫在此文件，而是由起始庫存事件與後續交易事件依序彙整，避免失去交易歷史。

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `_id` | `ObjectId` / objectId | MongoDB 產生 |
| `userId` | `ObjectId` / objectId | 必填、不可變；由伺服器登入狀態提供 |
| `initializationOperationId` | `string` / string | 必填、不可變；客戶端產生 UUID，供初始設定冪等重送 |
| `initialSecuritiesCash` | `number` / numeric | 必填、>= 0；初始設定當下的證券帳戶現金 |
| `initialFuturesPrincipal` | `number` / numeric | 必填、>= 0；初始設定當下的期貨配置本金 |
| `stockFeeRate` | `number` / numeric | 必填、0–1；第一版預設 `0.001425`（0.1425%），不設最低手續費 |
| `futuresFeePerContract` | `number` / numeric | 必填、>= 0；第一版預設每口每次成交 NT$30 |
| `initializedAt` | `Date` / date | 必填；使用者指定的帳本起始時間 |
| `createdAt`、`updatedAt` | `Date` / date | 必填；文件生命週期時間 |
| `__v` | `number` / int | Mongoose 可選版本欄位 |

所有欄位不接受 `null`；金額 0 表示確實為 0，不等同缺漏。`additionalProperties: false`、`validationLevel: strict`、`validationAction: error`。唯一索引 `{ userId: 1 }`，名稱 `userId_1`。所有 API 查詢均同時使用登入者的 `userId`，前端不得指定其他使用者。

示意文件（僅示意格式）：

```js
{ _id: ObjectId("000000000000000000000031"), userId: ObjectId("000000000000000000000101"),
  initializationOperationId: "10000000-0000-4000-8000-000000000001",
  initialSecuritiesCash: 600000, initialFuturesPrincipal: 400000,
  stockFeeRate: 0.001425, futuresFeePerContract: 30,
  initializedAt: ISODate("2026-09-21T01:00:00Z"), createdAt: ISODate("2026-09-21T01:00:00Z"),
  updatedAt: ISODate("2026-09-21T01:00:00Z") }
{ _id: ObjectId("000000000000000000000032"), userId: ObjectId("000000000000000000000102"),
  initializationOperationId: "20000000-0000-4000-8000-000000000002",
  initialSecuritiesCash: 0, initialFuturesPrincipal: 250000,
  stockFeeRate: 0.001425, futuresFeePerContract: 30,
  initializedAt: ISODate("2026-09-21T02:00:00Z"), createdAt: ISODate("2026-09-21T02:00:00Z"),
  updatedAt: ISODate("2026-09-21T02:00:00Z") }
```

## 新 collection：`spotFuturesTransactions`

保存起始庫存與後續成交事件。紀錄採 append-only；第一版不提供修改或刪除。若日後需要更正，另行設計反向更正事件，不直接改寫歷史。

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `_id` | `ObjectId` / objectId | MongoDB 產生 |
| `userId` | `ObjectId` / objectId | 必填、不可變；登入者 |
| `accountId` | `ObjectId` / objectId | 必填、不可變；指向同一使用者的 `spotFuturesAccounts._id` |
| `operationId` | `string` / string | 必填、不可變；一次表單送出的 UUID，供安全重送 |
| `sequence` | `number` / numeric | 必填、整數、>= 0；同一初始設定可包含多筆起始部位 |
| `kind` | `"opening" | "trade"` / string | 必填；起始庫存或後續成交 |
| `instrument` | `"0050" | "TMF"` / string | 必填 |
| `side` | `"buy" | "sell"` / string | 必填；`opening` 固定為 `buy` |
| `quantity` | `number` / numeric | 必填、整數、> 0；0050 為股數、TMF 為口數 |
| `price` | `number` / numeric | 必填、> 0；0050 每股成交價或 TMF 成交點數 |
| `contractMonth` | `string` / string，選填 | TMF 必填且為 `YYYYMM`；0050 必須省略 |
| `grossAmount` | `number` / numeric | 必填、> 0；0050 為股數 × 股價，TMF 為口數 × 點數 × 10 |
| `fee` | `number` / numeric | 必填、>= 0；起始庫存為 0；0050 為成交額 × 帳戶費率取整元；TMF 為口數 × 每口手續費 |
| `tax` | `number` / numeric | 必填、>= 0；0050 僅賣出收 ETF 交易稅；TMF 買賣皆按每口契約金額 × 0.00002 四捨五入至元後加總 |
| `cashChange` | `number` / numeric | 必填；起始庫存為 0；股票為實際扣款／入帳，期貨為費稅及平倉損益造成的本金變動 |
| `realizedProfitLoss` | `number` / numeric | 必填；非平倉交易為 0；賣出依移動平均成本計算並扣除該次費稅 |
| `positionQuantityAfter` | `number` / numeric | 必填、整數、>= 0；該商品（TMF 依月份）的交易後庫存 |
| `averageCostAfter` | `number` / numeric | 必填、>= 0；0050 為含買進手續費的每股移動平均成本，TMF 為不含費稅的平均進場點位；庫存歸零時為 0 |
| `fundBalanceAfter` | `number` / numeric | 必填；0050 為交易後證券現金，TMF 為交易後期貨配置本金，可因虧損為負數 |
| `occurredAt` | `Date` / date | 必填；使用者輸入的成交或起始庫存時間 |
| `createdAt`、`updatedAt` | `Date` / date | 必填；實際寫入與更新時間；第一版不修改歷史，因此兩者相同 |
| `__v` | `number` / int | Mongoose 可選版本欄位 |

`contractMonth` 缺漏與空字串不同：0050 必須缺漏，TMF 不可缺漏或為空。所有其他業務欄位不接受 `null` 或缺漏。跨欄位規則（商品與月份、起始事件必須買入、不得賣超／平倉超過庫存）由 model 輸入驗證及同一 MongoDB transaction 內的帳本重算共同保證。

索引：

- 唯一 `{ userId: 1, operationId: 1, sequence: 1 }`，名稱 `userId_1_operationId_1_sequence_1`，避免網路重送產生重複成交。
- `{ userId: 1, occurredAt: 1, _id: 1 }`，名稱 `userId_1_occurredAt_1__id_1`，用於依時間重播完整帳本。
- `{ userId: 1, instrument: 1, contractMonth: 1, occurredAt: 1, _id: 1 }`，名稱 `userId_1_instrument_1_contractMonth_1_occurredAt_1__id_1`，用於依商品與期貨月份彙整庫存。

示意文件（僅示意格式）：

```js
{ _id: ObjectId("000000000000000000000041"), userId: ObjectId("000000000000000000000101"),
  accountId: ObjectId("000000000000000000000031"), operationId: "10000000-0000-4000-8000-000000000001",
  sequence: 0, kind: "opening", instrument: "TMF", side: "buy", quantity: 1,
  price: 48001, contractMonth: "202610", grossAmount: 480010, fee: 0, tax: 0,
  cashChange: 0, realizedProfitLoss: 0, positionQuantityAfter: 1,
  averageCostAfter: 48001, fundBalanceAfter: 400000,
  occurredAt: ISODate("2026-09-21T01:00:00Z"), createdAt: ISODate("2026-09-21T01:00:00Z"),
  updatedAt: ISODate("2026-09-21T01:00:00Z") }
{ _id: ObjectId("000000000000000000000042"), userId: ObjectId("000000000000000000000101"),
  accountId: ObjectId("000000000000000000000031"), operationId: "30000000-0000-4000-8000-000000000003",
  sequence: 0, kind: "trade", instrument: "TMF", side: "buy", quantity: 1,
  price: 48050, contractMonth: "202610", grossAmount: 480500, fee: 30, tax: 10,
  cashChange: -40, realizedProfitLoss: 0, positionQuantityAfter: 2,
  averageCostAfter: 48025.5, fundBalanceAfter: 399960,
  occurredAt: ISODate("2026-09-21T03:00:00Z"), createdAt: ISODate("2026-09-21T03:00:00Z"),
  updatedAt: ISODate("2026-09-21T03:00:00Z") }
```

## 計算、生命週期與首次寫入

- 0050 與各 TMF 契約月份分開採移動平均；不同月份不互相抵銷。第一版只允許做多，賣出／平倉不可超過庫存。
- 0050 手續費第一版使用 `0.1425%` 且買賣皆收，不設最低手續費；ETF 交易稅只在賣出時計算。微臺每口手續費預設 NT$30，買賣皆收；期貨交易稅率為 `0.00002`，買賣皆收。
- 初始設定會在單一 MongoDB transaction 中建立 1 筆 account 與 0 至多筆 opening events；相同 `initializationOperationId` 重送只能讀回同一結果，不得建立第二個帳戶。
- 後續每次成交最多新增 1 筆交易文件；寫入前鎖定同一 account、重播該使用者帳本、檢查現金與庫存，再在同一 transaction 內新增。寫入後以 `_id` 查回。
- 文件為小型固定事件，沒有大型陣列或 TTL，單筆遠低於 16 MB。交易歷史預設永久保留，除非使用者日後明確核准刪除或另訂保留政策。
- 估值與時速表使用帳本彙整出的現金、0050 股數、各月份 TMF 口數／平均成本，再搭配既有共用行情；衍生曝險不另存文件。
- schema-only 建立預計新增 2 個空 collections、4 個自訂索引（加上各自 `_id_`），文件新增／更新／刪除均為 0。第一次真實帳戶與起始庫存寫入由登入使用者在頁面按下確認後另行觸發。
- 未來若支援放空、交易更正或不同商品，先新增 validator／帳務規則與相容遷移，不直接放寬既有資料。

## 已核准並完成的資料庫變更

建立前重新唯讀確認 `spotFuturesAccounts` 與 `spotFuturesTransactions` 均不存在；`spotFuturesConfigurations`、`futuresMarketPrices`、`stockIntradayPrices` 與 `stockClosingPrices` 的完整 validator、`strict/error` 設定、索引及文件數均與核准前快照一致。

建立後查回確認：

- `spotFuturesAccounts` 為 **0 筆**，validator 與 `models/SpotFuturesAccount.ts` 完全相符；索引為 `_id_` 與唯一的 `userId_1`。
- `spotFuturesTransactions` 為 **0 筆**，validator 與 `models/SpotFuturesTransaction.ts` 完全相符；索引為 `_id_`、唯一的 `userId_1_operationId_1_sequence_1`，以及兩個核准的帳本查詢索引。
- schema-only 操作新增文件 0、更新文件 0、刪除文件 0。舊配置仍為 0 筆；既有期貨行情 1 筆、盤中行情 2 筆、收盤行情 1 筆，均未改動。

schema-only 建立完成時尚無文件。其後開發伺服器收到一次已登入的 `POST /api/spot-futures/account`，實際建立帳戶 `_id: 6ab0f351f11d670627a81968`，以及兩筆起始庫存 `_id: 6ab0f351f11d670627a81969`、`6ab0f351f11d670627a8196a`；已用 `_id` 查回。內容為證券現金 600,000、期貨本金 400,000、0050 5,000 股／平均成本 100，以及 TMF 202610 1 口／進場 48,000。因無法判定是否為使用者剛輸入的正式資料，未自動刪除或覆寫。最終唯讀 API 驗證只讀取這些資料，無效請求前後文件數維持帳戶 1 筆、交易 2 筆。

# 微臺每口安全保證金欄位提案

狀態：2026-09-21 已由使用者核准並完成 schema 變更、既有帳戶回填、程式實作與完整驗證。

## 最新唯讀盤點（2026-09-21）

- 目標 database：`stock-speed`。
- `spotFuturesAccounts` 目前 1 筆；validator 為 `strict/error`、`additionalProperties: false`，索引為 `_id_` 與唯一 `userId_1`，完整定義與目前 `models/SpotFuturesAccount.ts` 一致。
- `spotFuturesTransactions` 目前 4 筆；validator 為 `strict/error`，索引為 `_id_`、唯一冪等索引，以及兩個既有帳本查詢索引，完整定義與目前 model 一致。
- 唯一帳戶的初始期貨本金為 NT$400,000；目前 TMF `202610` 為 2 口，最近一筆期貨交易後的帳本資金為 NT$399,920。
- 本次不修改 `spotFuturesTransactions`、行情 collections、既有交易文件或任何索引。

## 欄位與行為

在 `spotFuturesAccounts` 新增：

| 欄位 | TypeScript / BSON | 規則與來源 |
| --- | --- | --- |
| `futuresSafetyMarginPerContract` | `number` / numeric | 必填、> 0；使用者輸入的每口微臺安全保證金，初始建議值為當時期交所原始保證金，若期貨商要求更高則填期貨商數值 |

`null`、缺漏、0 與負數均不接受。欄位為可調整的帳戶風控設定，不回寫歷史交易。期交所 2026-08-12 公告微型臺指期貨每口維持保證金 NT$26,900、原始保證金 NT$35,050；期貨商可依客戶或自身風控收取更高金額，因此 UI 不宣稱能保證免於追繳或代沖銷。

程式行為：

- 起始設定的兩種模式都顯示「微臺每口安全保證金」，建議預填 NT$35,050，並提示使用者依期貨商最新標準調高。
- 建立既有微臺庫存時，`初始期貨本金 >= 每口安全保證金 × 起始總口數` 才能建立。
- 新增微臺買進時，以交易後總口數檢查 `交易後期貨帳本資金 >= 每口安全保證金 × 總口數`；不足即拒絕新增風險。平倉屬降低風險，即使低於門檻仍允許。
- 儀表板使用最新已保存行情計算 `保證金權益 = 期貨帳本資金 + 未實現損益`、`安全需求 = 每口安全保證金 × 未平倉總口數` 與剩餘緩衝；行情缺漏時明確標示無法完成即時判斷。
- 既有帳戶可更新這個風控設定，以因應期交所或期貨商日後調整；每次更新以帳戶 `_id` 查回驗證。
- 這是應用程式內的交易阻擋與警示，不是券商保證金帳戶，也無法防止行情跳空、盤後波動、期交所臨時調高保證金或期貨商較嚴格的代沖銷規則。

## 待核准資料庫遷移

預計只處理 `spotFuturesAccounts` 的 1 筆既有文件：

1. 重新唯讀比對完整 validator、`strict/error`、兩個索引、文件數 1、目標 `_id` 與目前 TMF 口數；任何漂移立即停止。
2. 先以 `collMod` 加入 `futuresSafetyMarginPerContract` 的 numeric、`> 0` 規則，但暫不列入 required，讓既有文件可精確回填。
3. 以唯一帳戶 `_id` 為條件，將 `futuresSafetyMarginPerContract` 回填為使用者核准的金額；預期 matched 1、modified 1，立即依 `_id` 查回。
4. 再以 `collMod` 將欄位加入 required，查回完整 validator、`strict/error`、索引與文件數。

預期文件結果：更新 1、插入 0、刪除 0；`spotFuturesTransactions` 仍為 4 筆且內容不變。若任一步驟失敗，立即重新查詢實際 validator 與目標文件，不自動重試、回滾、刪除或擴大修復範圍。

## 已核准並完成的安全保證金遷移

執行前重新唯讀確認完整 validator、`strict/error`、所有索引、帳戶 1 筆、交易 4 筆及唯一目標 `_id: 6ab1038a41665b61af5a6d53` 均與核准快照一致。遷移依核准順序完成：

- 先加入可選的 positive numeric 規則，再精確以 `_id` 回填 `futuresSafetyMarginPerContract: 35050`。
- 更新結果 matched 1、modified 1；以相同 `_id` 查回為 35,050。
- 最終 validator 已將欄位列為 required，維持 `validationLevel: strict`、`validationAction: error`。
- `spotFuturesAccounts` 仍為 1 筆，索引仍只有 `_id_` 與唯一 `userId_1`。
- `spotFuturesTransactions` 仍為 4 筆，完整 validator 與所有索引未變。
- 最終持久化結果：插入 0、更新 1、刪除 0、失敗 0。
- 更新後 model 已以真實 MongoDB 連線通過 schema 斷言；登入範圍的帳戶與估值 GET API 均回傳 200，安全保證金為 35,050，三個保證金指標均存在且行情缺漏為 0。API 驗證僅讀取資料，未呼叫 PATCH 或新增交易。
