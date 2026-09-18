# 00631L 盤中價格快照提案

狀態：程式碼已準備；資料庫 schema 尚未建立，尚未寫入任何盤中價格。

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

## 待核准的精確資料庫變更

只在 `stock-speed` 建立 `stockIntradayPrices`，使用 `models/StockIntradayPrice.ts` 的 `STOCK_INTRADAY_PRICE_VALIDATOR` 作為完整 validator，並設定 `validationLevel: "strict"`、`validationAction: "error"`；建立 `{ stockCode: 1 }`、`unique: true`、名稱 `stockCode_1` 的索引。預期新增 1 個 collection、2 個索引（含自動 `_id_`），新增、更新或刪除文件都是 0。既有 `stockClosingPrices` 不修改。執行前再次唯讀比對目標 collection 是否仍不存在、既有 collection 的 validator、設定、索引、筆數及樣本；若有漂移立即停止。

建立後唯讀查回 collection 設定、完整索引與筆數。首次真正的盤中價格寫入由使用者之後在交易日點擊按鈕觸發；會以 `stockCode: "00631L"` 取得或更新至多一筆，並由 model 用 `_id` 查回。若初次寫入失敗，先查明實際持久化結果，再決定是否重試。日後如需回復，先停止新 API 使用並檢查盤中快照；不自動刪除 collection 或文件。
