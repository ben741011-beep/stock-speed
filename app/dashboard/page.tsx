import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MonthlyIndexStats } from "@/components/MonthlyIndexStats";
import { getPositionAccounting } from "@/lib/positionAccounting";
import { calculateNetMarketValue } from "@/lib/trading";
import { ExposureRecordModel } from "@/models/ExposureRecord";
import { getStoredMarketValuationPrice } from "@/models/MarketValuationPrice";
import { IntradayPriceRefreshButton } from "@/components/IntradayPriceRefreshButton";
import { ExposureGauge } from "@/components/ExposureGauge";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

function signedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}NT$ ${money.format(Math.abs(value))}`;
}

function getRiskLevel(exposureRatio: number) {
  if (exposureRatio <= 50) return "極低風險";
  if (exposureRatio <= 80) return "偏低風險";
  if (exposureRatio <= 120) return "普通風險";
  if (exposureRatio <= 160) return "高風險";
  return "極高風險";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let error = "";
  let investment = 0;
  let cash = 0;
  let holdingShares = 0;
  let realizedProfitLoss = 0;
  let marketPrice: number | null = null;
  let quoteDate: string | null = null;
  let quoteAt: string | null = null;
  let priceType: "intraday" | "close" | null = null;
  let quoteFetchedAt: string | null = null;

  try {
    await connectToDatabase();
    const [record, quote] = await Promise.all([
      ExposureRecordModel.findOne({ userId: user.id }).sort({ updatedAt: -1 }).lean(),
      getStoredMarketValuationPrice("00631L"),
    ]);
    if (quote) {
      marketPrice = quote.price;
      quoteDate = quote.quoteDate;
      quoteAt = quote.quoteAt;
      priceType = quote.priceType;
      quoteFetchedAt = quote.fetchedAt;
    }
    if (record) {
      const accounting = await getPositionAccounting(record, user.id);
      investment = accounting.costBasis;
      cash = accounting.cash;
      holdingShares = accounting.holdingShares;
      realizedProfitLoss = accounting.realizedProfitLoss;
    }
  } catch {
    error = "目前無法讀取 MongoDB 資料，請稍後再試。";
  }

  if (!error && holdingShares > 0 && marketPrice === null) {
    error = "尚未儲存 00631L 價格，請先按下手動取得盤中價格。";
  }

  const valuation = calculateNetMarketValue(marketPrice === null ? 0 : holdingShares * marketPrice);
  const actualStockValue = valuation.netMarketValue;
  const estimatedSellingCosts = valuation.estimatedSellFee + valuation.estimatedSellTax;
  const stockValueDescription = marketPrice === null
    ? "尚無持股"
    : holdingShares.toLocaleString("zh-TW") + " 股 × NT" + "$" + " " + marketPrice.toFixed(2) + "，扣除預估賣出費用 NT" + "$" + " " + money.format(estimatedSellingCosts) + (priceType === "intraday" && quoteAt ? "・上次取得的盤中成交價 " + new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "short", timeStyle: "medium" }).format(new Date(quoteAt)) : quoteDate ? "・收盤價 " + quoteDate : "");
  const unrealizedProfitLoss = holdingShares > 0 ? actualStockValue - investment : 0;
  const totalProfitLoss = realizedProfitLoss + unrealizedProfitLoss;
  const profitLossRate = investment > 0 ? (unrealizedProfitLoss / investment) * 100 : 0;
  const profitLossTone = totalProfitLoss > 0
    ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
    : totalProfitLoss < 0
      ? "border-rose-400/20 bg-rose-400/5 text-rose-300"
      : "border-slate-400/15 bg-slate-400/5 text-slate-300";
  const portfolioValue = actualStockValue + cash;
  const exposureNotional = actualStockValue * 2;
  const exposureRatio = portfolioValue > 0 ? (exposureNotional / portfolioValue) * 100 : 0;
  const level = getRiskLevel(exposureRatio);
  const color = { "極低風險": "text-sky-300 bg-sky-400/10 ring-sky-400/30", "偏低風險": "text-teal-300 bg-teal-400/10 ring-teal-400/30", "普通風險": "text-yellow-300 bg-yellow-400/10 ring-yellow-400/30", "高風險": "text-orange-300 bg-orange-400/10 ring-orange-400/30", "極高風險": "text-red-300 bg-red-400/10 ring-red-400/30" };

  return (
    <main className="relative overflow-hidden px-5 py-12 sm:px-8 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(249,115,22,.13),transparent_31%)]" />
      <div className="relative mx-auto grid w-full min-w-0 max-w-5xl grid-cols-[minmax(0,1fr)] gap-8">
        <section className="mx-auto min-w-0 w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between"><div><p className="text-sm font-bold tracking-[.18em] text-teal-300">LIVE DASHBOARD</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">最新台股名目曝險</h1><p className="mt-2 text-sm text-slate-400">每次載入只讀取 MongoDB；按下按鈕取得並儲存盤中成交價。</p>{quoteFetchedAt ? <p className="mt-1 text-xs text-slate-500">資料庫更新時間：{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "medium" }).format(new Date(quoteFetchedAt))}</p> : null}</div><span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${color[level]}`}>{level}</span></div>
          <div className="mt-5"><IntradayPriceRefreshButton /></div>
          {error ? <p className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : portfolioValue === 0 ? <p className="mt-8 rounded-xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">尚無資料，請先前往「起始設定」選擇適合你的設定方式。</p> : <><ExposureGauge ratio={exposureRatio} /><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4"><p className="text-xs font-bold tracking-wider text-slate-500">名目曝險金額</p><p className="mt-2 text-xl font-bold">NT$ {money.format(exposureNotional)}</p></div><div className="rounded-2xl border border-teal-400/15 bg-teal-400/5 p-4"><p className="text-xs font-bold tracking-wider text-teal-300/70">目前持股市值</p><p className="mt-2 text-xl font-bold">NT$ {money.format(actualStockValue)}</p><p className="mt-1 text-[11px] text-slate-500">{stockValueDescription}</p></div><div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4"><p className="text-xs font-bold tracking-wider text-sky-300/70">目前可用現金</p><p className="mt-2 text-xl font-bold">NT$ {money.format(cash)}</p></div><div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4"><p className="text-xs font-bold tracking-wider text-amber-300/70">目前持股成本</p><p className="mt-2 text-xl font-bold">NT$ {money.format(investment)}</p><p className="mt-1 text-[11px] text-slate-500">歷次買入金額＋買入手續費</p></div><div className={`rounded-2xl border p-4 ${profitLossTone}`}><p className="text-xs font-bold tracking-wider opacity-70">目前總損益</p><p className="mt-2 text-xl font-bold">{signedMoney(totalProfitLoss)}</p><p className="mt-1 text-[11px] opacity-70">已實現 {signedMoney(realizedProfitLoss)}・未實現 {signedMoney(unrealizedProfitLoss)}</p><p className="mt-1 text-[11px] opacity-70">持股報酬率 {signedPercent(profitLossRate)}・成本 NT$ {money.format(investment)}</p></div></div></>}
        </section>
        <MonthlyIndexStats />
      </div>
    </main>
  );
}

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}
