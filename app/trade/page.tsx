"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { calculateBrokerFee, calculateEtfSellTax } from "@/lib/trading";

const money = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });

export default function TradePage() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [cash, setCash] = useState<number | null>(null);
  const [holdingShares, setHoldingShares] = useState<number | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const amount = Number(shares) * Number(price);
  const fee = Number.isFinite(amount) && amount > 0 ? calculateBrokerFee(amount) : 0;
  const tax = side === "sell" && amount > 0 ? calculateEtfSellTax(amount) : 0;
  const cashChange = side === "buy" ? -(amount + fee) : amount - fee - tax;

  useEffect(() => {
    fetch("/api/exposure/trade").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCash(data.cash); setHoldingShares(data.holdingShares);
    }).catch((reason) => setStatus({ type: "error", message: reason instanceof Error ? reason.message : "無法讀取目前現金。" }));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setStatus(null);
    try {
      const response = await fetch("/api/exposure/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, shares: Number(shares), price: Number(price) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "交易失敗，請稍後再試。");
      setCash(data.cash); setHoldingShares(data.holdingShares); setShares(""); setPrice(""); setStatus({ type: "success", message: data.message });
    } catch (reason) { setStatus({ type: "error", message: reason instanceof Error ? reason.message : "交易失敗，請稍後再試。" }); } finally { setLoading(false); }
  }

  return <main className="min-h-[calc(100vh-8rem)] overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-16"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(249,115,22,.13),transparent_31%)]" /><div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center"><section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8"><p className="mb-2 text-sm font-bold tracking-[.18em] text-teal-300">TRADE</p><h1 className="text-3xl font-bold tracking-tight text-white">買賣 00631L</h1><p className="mt-3 leading-7 text-slate-400">成交金額與額外成本會累加到目前的暴險紀錄。</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 p-5"><p className="text-sm font-semibold text-teal-100">目前可使用的現金</p><p className="mt-1 text-2xl font-bold text-white">{cash === null ? "讀取中…" : money.format(cash)}</p></div><div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-5"><p className="text-sm font-semibold text-orange-100">目前持有股數</p><p className="mt-1 text-2xl font-bold text-white">{holdingShares === null ? "讀取中…" : `${holdingShares.toLocaleString("zh-TW")} 股`}</p></div></div><form className="mt-6 space-y-5" onSubmit={submit}><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setSide("buy")} className={`rounded-2xl px-4 py-3 font-bold ${side === "buy" ? "bg-teal-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>買入</button><button type="button" onClick={() => setSide("sell")} className={`rounded-2xl px-4 py-3 font-bold ${side === "sell" ? "bg-orange-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>賣出</button></div><div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-200">股數</span><input required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold outline-none focus:border-teal-400" type="number" min="0.001" step="any" value={shares} onChange={(event) => setShares(event.target.value)} /></label><label><span className="mb-2 block text-sm font-semibold text-slate-200">每股價格</span><div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-teal-400"><span className="text-slate-500">NT$</span><input required className="w-full bg-transparent px-3 py-4 text-lg font-semibold outline-none" type="number" min="0.001" step="any" value={price} onChange={(event) => setPrice(event.target.value)} /></div></label></div><div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 px-5 py-4"><div className="flex justify-between text-sm text-teal-100"><span>成交金額</span><span>{money.format(amount || 0)}</span></div><div className="mt-2 flex justify-between text-sm text-teal-100"><span>手續費（0.1425%）</span><span>{money.format(fee)}</span></div>{side === "sell" && <div className="mt-2 flex justify-between text-sm text-teal-100"><span>交易稅（0.1%，賣出）</span><span>{money.format(tax)}</span></div>}<div className="mt-3 border-t border-teal-300/20 pt-3"><p className="text-sm font-medium text-teal-100">{side === "buy" ? "實際扣款" : "實際入帳"}</p><p className="mt-1 text-2xl font-bold text-white">{money.format(Math.abs(cashChange))}</p></div></div>{status && <p className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>{status.message}</p>}<button disabled={loading || cash === null} className="w-full rounded-2xl bg-teal-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-70">{loading ? "處理中…" : `確認${side === "buy" ? "買入" : "賣出"}`}</button></form><p className="mt-5 text-center text-sm text-slate-400">尚未設定起始資金？ <Link className="font-bold text-teal-300 hover:text-teal-200" href="/setup">前往起始設定</Link></p></section></div></main>;
}
