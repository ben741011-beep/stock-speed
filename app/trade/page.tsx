"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { TradeHistory } from "@/components/TradeHistory";
import { calculateBrokerFee, calculateEtfSellTax } from "@/lib/trading";

const money = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

type Status = { type: "success" | "error"; message: string } | null;

export default function TradePage() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [cash, setCash] = useState<number | null>(null);
  const [fundsCash, setFundsCash] = useState("");
  const [holdingShares, setHoldingShares] = useState<number | null>(null);
  const [tradeStatus, setTradeStatus] = useState<Status>(null);
  const [fundsStatus, setFundsStatus] = useState<Status>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const amount = Number(shares) * Number(price);
  const fee = Number.isFinite(amount) && amount > 0 ? calculateBrokerFee(amount) : 0;
  const tax = side === "sell" && amount > 0 ? calculateEtfSellTax(amount) : 0;
  const cashChange = side === "buy" ? -(amount + fee) : amount - fee - tax;

  useEffect(() => {
    fetch("/api/exposure/trade")
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 404) setNeedsSetup(true);
        if (!response.ok) throw new Error(data.error);
        setCash(data.cash);
        setFundsCash(String(data.cash));
        setHoldingShares(data.holdingShares);
      })
      .catch((reason) => setTradeStatus({
        type: "error",
        message: reason instanceof Error ? reason.message : "無法讀取目前現金。",
      }));
  }, []);

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTradeLoading(true);
    setTradeStatus(null);
    try {
      const response = await fetch("/api/exposure/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, shares: Number(shares), price: Number(price) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "交易失敗，請稍後再試。");
      setCash(data.cash);
      setFundsCash(String(data.cash));
      setHoldingShares(data.holdingShares);
      setShares("");
      setPrice("");
      setTradeStatus({ type: "success", message: data.message });
      setHistoryRefreshKey((key) => key + 1);
    } catch (reason) {
      setTradeStatus({
        type: "error",
        message: reason instanceof Error ? reason.message : "交易失敗，請稍後再試。",
      });
    } finally {
      setTradeLoading(false);
    }
  }

  async function submitFunds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFundsLoading(true);
    setFundsStatus(null);
    try {
      const response = await fetch("/api/exposure/trade", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cash: Number(fundsCash) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法更新帳戶資金。");
      setCash(data.cash);
      setFundsCash(String(data.cash));
      setFundsStatus({ type: "success", message: data.message });
    } catch (reason) {
      setFundsStatus({
        type: "error",
        message: reason instanceof Error ? reason.message : "無法更新帳戶資金。",
      });
    } finally {
      setFundsLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-14">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(249,115,22,.13),transparent_31%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[.2em] text-orange-300">00631L MANAGEMENT</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">00631L 帳本管理</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">所有買賣與目前可用現金的調整都集中在這裡。</p>
          </div>
          <Link href="/dashboard" className="shrink-0 rounded-2xl border border-violet-300/30 bg-violet-300/10 px-5 py-3 text-center text-sm font-black text-violet-100 transition hover:bg-violet-300/20">返回時速表</Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 p-5">
            <p className="text-sm font-semibold text-teal-100">目前可使用的現金</p>
            <p className="mt-1 text-2xl font-bold text-white">{cash === null ? "讀取中…" : money.format(cash)}</p>
          </div>
          <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-5">
            <p className="text-sm font-semibold text-orange-100">目前持有股數</p>
            <p className="mt-1 text-2xl font-bold text-white">{holdingShares === null ? "讀取中…" : `${holdingShares.toLocaleString("zh-TW")} 股`}</p>
          </div>
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
            <p className="text-xs font-black tracking-[.18em] text-teal-300">NEW TRANSACTION</p>
            <h2 className="mt-2 text-2xl font-black text-white">新增買賣</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">成交金額與額外成本會累加到目前的暴險紀錄。</p>
            <form className="mt-6 space-y-5" onSubmit={submitTrade}>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSide("buy")} className={`rounded-2xl px-4 py-3 font-bold ${side === "buy" ? "bg-teal-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>買入</button>
                <button type="button" onClick={() => setSide("sell")} className={`rounded-2xl px-4 py-3 font-bold ${side === "sell" ? "bg-orange-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>賣出</button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-200">股數</span>
                  <input required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold outline-none focus:border-teal-400" type="number" min="0.001" step="any" value={shares} onChange={(event) => setShares(event.target.value)} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-200">每股價格</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">NT$</span>
                    <input required className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-4 pl-14 pr-4 text-lg font-semibold outline-none focus:border-teal-400" type="number" min="0.001" step="any" value={price} onChange={(event) => setPrice(event.target.value)} />
                  </div>
                </label>
              </div>
              <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 px-5 py-4">
                <p className="flex justify-between text-sm text-teal-100"><span>成交金額</span><span>{money.format(amount || 0)}</span></p>
                <p className="mt-2 flex justify-between text-sm text-teal-100"><span>手續費（0.1425%）</span><span>{money.format(fee)}</span></p>
                {side === "sell" ? <p className="mt-2 flex justify-between text-sm text-teal-100"><span>交易稅（0.1%，賣出）</span><span>{money.format(tax)}</span></p> : null}
                <div className="mt-3 border-t border-teal-300/20 pt-3">
                  <p className="text-sm font-medium text-teal-100">{side === "buy" ? "實際扣款" : "實際入帳"}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{money.format(Math.abs(cashChange))}</p>
                </div>
              </div>
              {tradeStatus ? <StatusMessage status={tradeStatus} /> : null}
              <button disabled={tradeLoading || cash === null} className="w-full rounded-2xl bg-teal-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-70">{tradeLoading ? "處理中…" : `確認${side === "buy" ? "買入" : "賣出"}`}</button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
            <p className="text-xs font-black tracking-[.18em] text-sky-300">ACCOUNT FUNDS</p>
            <h2 className="mt-2 text-2xl font-black text-white">修改帳戶資金</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">輸入目前實際可用的現金；系統只調整資金，不會改動 00631L 股數、持股成本或交易紀錄。</p>
            <form className="mt-6 space-y-5" onSubmit={submitFunds}>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-200">目前可用現金</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">NT$</span>
                  <input required className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-4 pl-14 pr-4 text-lg font-semibold outline-none focus:border-sky-400" type="number" min="0" step="1" value={fundsCash} onChange={(event) => setFundsCash(event.target.value)} />
                </div>
              </label>
              <p className="rounded-2xl border border-sky-300/15 bg-sky-300/[.06] p-4 text-xs leading-6 text-slate-400">修改後會保留既有買賣紀錄，並用新的現金金額重新計算帳本；不會新增一筆買賣。</p>
              {fundsStatus ? <StatusMessage status={fundsStatus} /> : null}
              <button disabled={fundsLoading || cash === null} className="w-full rounded-2xl bg-sky-300 px-5 py-4 font-black text-slate-950 transition hover:bg-sky-200 disabled:opacity-60">{fundsLoading ? "更新中…" : "確認修改資金"}</button>
            </form>
          </section>
        </div>

        <section className="mt-7 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <TradeHistory refreshKey={historyRefreshKey} />
        </section>
        {needsSetup ? <p className="mt-5 text-center text-sm text-slate-400">尚未設定起始資金？ <Link className="font-bold text-teal-300 hover:text-teal-200" href="/setup">前往起始設定</Link></p> : null}
      </div>
    </main>
  );
}

function StatusMessage({ status }: { status: Exclude<Status, null> }) {
  return (
    <p role={status.type === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
      {status.message}
    </p>
  );
}
