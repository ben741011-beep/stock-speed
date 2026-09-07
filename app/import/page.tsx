"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const TAIPEI_TODAY = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Taipei",
}).format(new Date());

const money = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

function signedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${money.format(Math.abs(value))}`;
}

export default function ImportPositionPage() {
  const [holdingShares, setHoldingShares] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [bookValue, setBookValue] = useState("");
  const [cash, setCash] = useState("");
  const [asOfDate, setAsOfDate] = useState(TAIPEI_TODAY);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const cost = Number(costBasis);
  const value = Number(bookValue);
  const hasValuation = costBasis !== "" && bookValue !== "" && cost > 0 && Number.isFinite(value);
  const calculatedProfitLoss = hasValuation ? value - cost : null;
  const calculatedRate = hasValuation ? ((value - cost) / cost) * 100 : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/exposure/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingShares: Number(holdingShares),
          costBasis: Number(costBasis),
          bookValue: Number(bookValue),
          cash: Number(cash),
          asOfDate,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "匯入失敗，請稍後再試。");

      setStatus({ type: "success", message: data.message });
    } catch (reason) {
      setStatus({
        type: "error",
        message: reason instanceof Error ? reason.message : "匯入失敗，請稍後再試。",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(249,115,22,.13),transparent_31%)]" />
      <section className="relative mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
        <p className="text-sm font-bold tracking-[.18em] text-violet-300">OPENING POSITION</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">匯入既有 00631L 持股</h1>
        <p className="mt-3 leading-7 text-slate-400">
          這是部位快照，不會被當成新買入，也不會再次計算手續費或交易稅。
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-200">目前持有股數</span>
              <input required type="number" min="0.001" step="any" value={holdingShares} onChange={(event) => setHoldingShares(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold outline-none focus:border-violet-400" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-200">資料基準日期</span>
              <input
                required
                aria-describedby="date-help"
                type="date"
                max={TAIPEI_TODAY}
                value={asOfDate}
                onChange={(event) => setAsOfDate(event.target.value)}
                onClick={(event) => event.currentTarget.showPicker?.()}
                onKeyDown={(event) => {
                  if (event.key === "Tab" || event.key === "Escape") return;
                  event.preventDefault();
                  if (event.key === "Enter" || event.key === " ") {
                    event.currentTarget.showPicker?.();
                  }
                }}
                onPaste={(event) => event.preventDefault()}
                className="w-full cursor-pointer rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold outline-none focus:border-violet-400"
              />
              <span id="date-help" className="mt-1 block text-xs text-slate-500">點擊欄位後從日曆選擇，不能輸入未來日期。</span>
            </label>
            <MoneyInput label="目前持股成本" value={costBasis} onChange={setCostBasis} />
            <MoneyInput label="目前帳面價值" value={bookValue} onChange={setBookValue} />
            <MoneyInput label="目前可用現金" value={cash} onChange={setCash} />
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-5">
            <p className="text-xs font-bold tracking-wider text-violet-200/70">目前持股損益率</p>
            {calculatedRate === null || calculatedProfitLoss === null ? (
              <p className="mt-2 text-xl font-bold text-white">請輸入目前持股成本與目前帳面價值</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold text-white">
                  {calculatedRate >= 0 ? "+" : ""}{calculatedRate.toFixed(2)}%
                </p>
                <p className="mt-1 text-sm text-violet-100/80">目前帳面損益 {signedMoney(calculatedProfitLoss)}</p>
              </>
            )}
            <p className="mt-2 text-xs leading-5 text-slate-400">
              系統依「（目前帳面價值 − 目前持股成本）÷ 目前持股成本」自動計算。
            </p>
          </div>

          {status && (
            <p role="status" aria-live="polite" className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
              {status.message}
            </p>
          )}

          <button disabled={loading} className="w-full rounded-2xl bg-violet-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-violet-300 disabled:opacity-70">
            {loading ? "匯入中…" : "確認匯入既有持股"}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-400">
          <Link href="/setup" className="font-bold text-teal-300 hover:text-teal-200">返回起始方式</Link>
          <Link href="/trade" className="font-bold text-teal-300 hover:text-teal-200">前往買賣</Link>
        </div>
      </section>
    </main>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-violet-400">
        <span className="text-slate-500">NT$</span>
        <input required type="number" min="0" step="any" value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent px-3 py-4 text-lg font-semibold outline-none" />
      </div>
    </label>
  );
}
