"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ExposureGauge } from "@/components/ExposureGauge";
import { calculateEtfSellTax, calculateFuturesTax, calculateStockFee } from "@/lib/spotFuturesLedgerCore";
import type { SpotFuturesLedgerSnapshot } from "@/lib/spotFuturesLedger";
import type { SpotFuturesValuationResponse } from "@/lib/spotFuturesValuation";

type ValuationResponse = SpotFuturesValuationResponse & { partial?: boolean; message?: string };
type Status = { type: "success" | "error" | "info"; message: string } | null;
type InitialSetupMode = "empty" | "existing";
type DashboardProps = {
  initialLedger: SpotFuturesLedgerSnapshot | null;
  initialValuation: SpotFuturesValuationResponse | null;
  initialError: string;
};

const money = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 });
const taipeiDateTimeParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function localDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function riskTone(level: string) {
  if (level === "極低風險") return "bg-sky-400/10 text-sky-300 ring-sky-400/30";
  if (level === "偏低風險") return "bg-teal-400/10 text-teal-300 ring-teal-400/30";
  if (level === "普通風險") return "bg-yellow-400/10 text-yellow-300 ring-yellow-400/30";
  if (level === "高風險") return "bg-orange-400/10 text-orange-300 ring-orange-400/30";
  return "bg-red-400/10 text-red-300 ring-red-400/30";
}

export function SpotFuturesDashboard({
  initialLedger,
  initialValuation,
  initialError,
}: DashboardProps) {
  const [ledger, setLedger] = useState(initialLedger);
  const [valuation, setValuation] = useState<ValuationResponse | null>(initialValuation);
  const [status, setStatus] = useState<Status>(null);
  const [quoteError, setQuoteError] = useState(initialError && initialLedger ? initialError : "");
  const [busy, setBusy] = useState(false);

  async function refreshQuotes() {
    setBusy(true); setStatus(null); setQuoteError("");
    try {
      const response = await fetch("/api/spot-futures/valuation", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法取得官方行情。");
      setValuation(data);
      setLedger(data.ledger);
      if (data.partial) setQuoteError(data.message ?? "部分行情無法更新。");
      else setStatus({ type: "info", message: data.message });
    } catch (reason) {
      setQuoteError(reason instanceof Error ? reason.message : "無法取得官方行情。");
    } finally { setBusy(false); }
  }

  const statusTone = status?.type === "error"
    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
    : status?.type === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : "border-sky-400/20 bg-sky-500/10 text-sky-200";

  return (
    <main className="relative overflow-hidden px-5 py-10 sm:px-8 lg:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(139,92,246,.14),transparent_31%)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black tracking-[.2em] text-teal-300">SPOT + FUTURES EXPOSURE</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">0050＋微臺時速表</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">集中查看目前淨資產、名目曝險、未實現損益與保證金安全緩衝。</p></div>
          <Link href="/spot-futures/manage" className="shrink-0 rounded-2xl border border-teal-300/30 bg-teal-300/10 px-5 py-3 text-center text-sm font-black text-teal-100 transition hover:bg-teal-300/20">前往帳本管理</Link>
        </header>

        {status ? <p role={status.type === "error" ? "alert" : "status"} className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${statusTone}`}>{status.message}</p> : null}

        {!ledger ? <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-7 text-center shadow-2xl shadow-black/20"><h2 className="text-2xl font-black text-white">尚未建立0050＋微臺帳本</h2><p className="mt-3 text-sm leading-7 text-slate-400">請先到帳本管理設定台股現金、期貨資金與起始庫存。</p>{initialError ? <InlineError message={initialError} /> : null}<Link href="/spot-futures/manage" className="mt-6 inline-flex rounded-2xl bg-teal-300 px-6 py-3.5 font-black text-slate-950 hover:bg-teal-200">建立帳本</Link></section> : <ValuationPanel valuation={valuation} busy={busy} error={quoteError} onRefresh={refreshQuotes} />}
      </div>
    </main>
  );
}

export function SpotFuturesManagement({ initialLedger, initialError }: Pick<DashboardProps, "initialLedger" | "initialError">) {
  const [ledger, setLedger] = useState(initialLedger);
  const [status, setStatus] = useState<Status>(initialError ? { type: "error", message: initialError } : null);
  const [busy, setBusy] = useState<"initial" | "trade" | "margin" | "funds" | null>(null);
  const statusTone = status?.type === "error" ? "border-rose-400/20 bg-rose-500/10 text-rose-200" : status?.type === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-sky-400/20 bg-sky-500/10 text-sky-200";
  async function complete(next: SpotFuturesLedgerSnapshot, message: string) {
    setLedger(next); setStatus({ type: "success", message }); setBusy(null);
  }
  return (
    <main className="relative overflow-hidden px-5 py-10 sm:px-8 lg:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(139,92,246,.14),transparent_31%)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black tracking-[.2em] text-orange-300">SPOT + FUTURES MANAGEMENT</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">0050＋微臺帳本管理</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">所有會修改 MongoDB 的資金設定、買賣與保證金調整都集中在這裡。</p></div>
          <Link href="/spot-futures" className="shrink-0 rounded-2xl border border-violet-300/30 bg-violet-300/10 px-5 py-3 text-center text-sm font-black text-violet-100 transition hover:bg-violet-300/20">返回時速表</Link>
        </header>
        {status ? <p role={status.type === "error" ? "alert" : "status"} className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${statusTone}`}>{status.message}</p> : null}
        {!ledger ? <InitialSetupForm busy={busy === "initial"} onBusy={(value) => { setBusy(value); setStatus(null); }} onComplete={complete} onError={() => setBusy(null)} /> : <>
          <InventorySummary ledger={ledger} busy={busy === "margin"} onBusy={(value) => { setBusy(value); setStatus(null); }} onComplete={complete} onError={() => setBusy(null)} />
          <div className="mt-7 grid gap-7 xl:grid-cols-2">
            <TradeForm ledger={ledger} busy={busy === "trade"} onBusy={(value) => { setBusy(value); setStatus(null); }} onComplete={complete} onError={() => setBusy(null)} />
            <FundsUpdateForm key={`${ledger.inventory.securitiesCash}-${ledger.inventory.futuresBalance}`} ledger={ledger} busy={busy === "funds"} onBusy={(value) => { setBusy(value); setStatus(null); }} onComplete={complete} onError={() => setBusy(null)} />
          </div>
          <TransactionHistory ledger={ledger} />
        </>}
      </div>
    </main>
  );
}

function InitialSetupForm({ busy, onBusy, onComplete, onError }: {
  busy: boolean;
  onBusy: (value: "initial") => void;
  onComplete: (ledger: SpotFuturesLedgerSnapshot, message: string) => Promise<void>;
  onError: () => void;
}) {
  const [mode, setMode] = useState<InitialSetupMode | null>(null);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({
    securitiesCash: "0", futuresPrincipal: "0", futuresSafetyMargin: "35050", spotShares: "0", spotAverageCost: "",
    futuresContracts: "0", futuresContractMonth: "", futuresEntryPoint: "", futuresFee: "30",
    initializedAt: localDateTimeValue(),
  });
  function field(name: keyof typeof form, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); onBusy("initial");
    try {
      if (!mode) throw new Error("請先選擇起始設定方式。");
      const spotShares = mode === "existing" ? Number(form.spotShares) : 0;
      const futuresContracts = mode === "existing" ? Number(form.futuresContracts) : 0;
      if (mode === "existing" && spotShares <= 0 && futuresContracts <= 0) {
        throw new Error("已經有持股模式至少要輸入一筆 0050 或微臺起始庫存。");
      }
      const response = await fetch("/api/spot-futures/account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          initialSecuritiesCash: Number(form.securitiesCash),
          initialFuturesPrincipal: Number(form.futuresPrincipal),
          futuresSafetyMarginPerContract: Number(form.futuresSafetyMargin),
          futuresFeePerContract: Number(form.futuresFee),
          initializedAt: new Date(form.initializedAt).toISOString(),
          spotOpening: spotShares > 0 ? { instrument: "0050", quantity: spotShares, price: Number(form.spotAverageCost) } : null,
          futuresOpenings: futuresContracts > 0 ? [{ instrument: "TMF", quantity: futuresContracts, price: Number(form.futuresEntryPoint), contractMonth: form.futuresContractMonth.replace("-", "") }] : [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法建立初始設定。");
      await onComplete(data.ledger, data.message);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "無法建立初始設定。");
      onError();
    }
  }

  if (!mode) {
    const options: Array<{
      mode: InitialSetupMode;
      eyebrow: string;
      title: string;
      description: string;
      action: string;
      tone: "teal" | "violet";
    }> = [
      {
        mode: "empty",
        eyebrow: "CASH ONLY",
        title: "一開始還沒有持股",
        description: "先設定證券現金與期貨配置本金，之後再用買賣功能建立 0050 與微臺部位。",
        action: "設定起始資金",
        tone: "teal",
      },
      {
        mode: "existing",
        eyebrow: "EXISTING POSITION",
        title: "已經有持股",
        description: "輸入目前持有的 0050 股數、平均成本，或微臺口數、契約月份與進場點位。",
        action: "匯入既有部位",
        tone: "violet",
      },
    ];

    return (
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
        <p className="text-xs font-black tracking-[.18em] text-orange-300">GET STARTED</p>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">選擇你的起始方式</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">依照目前是否持有 0050 或微臺部位選擇一種設定方式。初始設定建立後，第一版不提供重設。</p>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {options.map((option) => {
            const isTeal = option.tone === "teal";
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => setMode(option.mode)}
                className={`group flex min-h-64 flex-col rounded-3xl border p-6 text-left transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 ${
                  isTeal
                    ? "border-teal-400/20 bg-teal-400/10 hover:border-teal-300/50 focus-visible:ring-teal-400/30"
                    : "border-violet-400/20 bg-violet-400/10 hover:border-violet-300/50 focus-visible:ring-violet-400/30"
                }`}
              >
                <span className={`text-xs font-bold tracking-[.18em] ${isTeal ? "text-teal-300" : "text-violet-300"}`}>{option.eyebrow}</span>
                <span className="mt-3 text-2xl font-bold text-white">{option.title}</span>
                <span className="mt-3 leading-7 text-slate-300">{option.description}</span>
                <span className={`mt-auto pt-8 font-bold ${isTeal ? "text-teal-300" : "text-violet-300"}`}>{option.action} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span></span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const hasExistingPositions = mode === "existing";
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl"><p className="text-xs font-black tracking-[.18em] text-orange-300">ONE-TIME SETUP</p><h2 className="mt-2 text-2xl font-black text-white">{hasExistingPositions ? "匯入既有部位" : "設定起始資金"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{hasExistingPositions ? "請輸入目前真正持有的部位；起始庫存不重算過去費稅，從下一筆買賣開始記錄。" : "目前沒有持股或未平倉部位，只建立可供後續交易使用的起始資金。"}</p></div>
        <button type="button" onClick={() => setMode(null)} className="shrink-0 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">重新選擇</button>
      </div>
      <form className="mt-7 space-y-6" onSubmit={submit}>
        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="setup-spot-heading" className="rounded-3xl border border-sky-300/20 bg-sky-300/[.05] p-5">
            <p className="text-xs font-black tracking-[.18em] text-sky-300">SPOT・0050</p>
            <h3 id="setup-spot-heading" className="mt-1 text-xl font-black text-white">0050 現股設定</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">這一區只記錄證券帳戶資金與0050庫存。</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumberField label="證券帳戶現金" prefix="NT$" value={form.securitiesCash} min="0" step="1" onChange={(v) => field("securitiesCash", v)} />
              {hasExistingPositions ? <>
                <NumberField label="0050 初始股數" value={form.spotShares} min="0" step="1" onChange={(v) => field("spotShares", v)} />
                <NumberField label="0050 初始平均成本" prefix="NT$" value={form.spotAverageCost} min="0.01" step="0.01" required={Number(form.spotShares) > 0} onChange={(v) => field("spotAverageCost", v)} />
              </> : null}
            </div>
            <p className="mt-4 rounded-2xl border border-sky-300/10 bg-slate-950/35 px-4 py-3 text-xs leading-5 text-slate-400">0050 手續費率固定先用 0.1425%。</p>
          </section>
          <section aria-labelledby="setup-futures-heading" className="rounded-3xl border border-amber-300/20 bg-amber-300/[.05] p-5">
            <p className="text-xs font-black tracking-[.18em] text-amber-300">FUTURES・TMF</p>
            <h3 id="setup-futures-heading" className="mt-1 text-xl font-black text-white">微型臺指期設定</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">這一區只記錄期貨本金、費用與微臺未平倉部位。</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <NumberField label="期貨配置本金" prefix="NT$" value={form.futuresPrincipal} min="0" step="1" onChange={(v) => field("futuresPrincipal", v)} />
              <NumberField label="每口安全保證金" prefix="NT$" value={form.futuresSafetyMargin} min="1" step="1" onChange={(v) => field("futuresSafetyMargin", v)} />
              <NumberField label="每口手續費" prefix="NT$" value={form.futuresFee} min="0" step="1" onChange={(v) => field("futuresFee", v)} />
              {hasExistingPositions ? <>
                <NumberField label="初始口數" value={form.futuresContracts} min="0" step="1" onChange={(v) => field("futuresContracts", v)} />
                <MonthField label="初始契約月份" value={form.futuresContractMonth} required={Number(form.futuresContracts) > 0} onChange={(v) => field("futuresContractMonth", v)} />
                <NumberField label="初始進場點位" value={form.futuresEntryPoint} min="1" step="0.01" required={Number(form.futuresContracts) > 0} onChange={(v) => field("futuresEntryPoint", v)} />
              </> : null}
            </div>
            <p className="mt-4 rounded-2xl border border-amber-300/10 bg-slate-950/35 px-4 py-3 text-xs leading-5 text-slate-400">安全保證金預填 35,050 元；微臺手續費預設每口 30 元。</p>
          </section>
        </div>
        <section aria-labelledby="setup-common-heading" className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <h3 id="setup-common-heading" className="text-sm font-black text-white">共用帳本時間</h3>
          <div className="mt-3 max-w-xl"><DateTimeField label="帳本起始時間" value={form.initializedAt} onChange={(v) => field("initializedAt", v)} /></div>
        </section>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.06] p-4 text-xs leading-6 text-slate-400">安全保證金請依你的期貨商最新原始保證金調高；系統會阻擋低於門檻的新增部位，但行情跳空、盤後波動或期貨商臨時調整仍可能造成追繳。</div>
        <div className={`grid gap-3 ${actionError ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch" : ""}`}>
          {actionError ? <InlineError message={actionError} /> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-teal-400 px-5 py-4 font-black text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">{busy ? "建立中…" : hasExistingPositions ? "確認匯入既有部位" : "確認設定起始資金"}</button>
        </div>
      </form>
    </section>
  );
}

function InventorySummary({ ledger, busy, onBusy, onComplete, onError }: {
  ledger: SpotFuturesLedgerSnapshot;
  busy: boolean;
  onBusy: (value: "margin") => void;
  onComplete: (ledger: SpotFuturesLedgerSnapshot, message: string) => Promise<void>;
  onError: () => void;
}) {
  const inventory = ledger.inventory;
  const [safetyMargin, setSafetyMargin] = useState(String(ledger.account.futuresSafetyMarginPerContract));
  const [actionError, setActionError] = useState("");
  async function updateSafetyMargin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); onBusy("margin");
    try {
      const response = await fetch("/api/spot-futures/account", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ futuresSafetyMarginPerContract: Number(safetyMargin) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法更新安全保證金。");
      await onComplete(data.ledger, data.message);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "無法更新安全保證金。");
      onError();
    }
  }
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="0050 庫存" value={`${inventory.spotShares.toLocaleString("zh-TW")} 股`} detail={inventory.spotShares ? `平均成本 ${money.format(inventory.spotAverageCost)}` : "目前無持股"} tone="sky" />
        <Metric label="證券現金" value={money.format(inventory.securitiesCash)} detail={`手續費率 ${(ledger.account.stockFeeRate * 100).toFixed(4)}%`} tone="teal" />
        <Metric label="期貨配置本金" value={money.format(inventory.futuresBalance)} detail={`每口每次手續費 ${money.format(ledger.account.futuresFeePerContract)}`} tone="amber" />
        <Metric label="累計交易成本" value={money.format(inventory.totalFees + inventory.totalTaxes)} detail={`手續費 ${money.format(inventory.totalFees)}・稅 ${money.format(inventory.totalTaxes)}`} tone="slate" />
        <Metric label="累計已實現損益" value={signedMoney(inventory.realizedProfitLoss)} detail="賣出與平倉後、扣除該次費稅" tone={inventory.realizedProfitLoss < 0 ? "rose" : "emerald"} />
        {inventory.futuresPositions.map((position) => <Metric key={position.contractMonth} label={`TMF ${formatMonth(position.contractMonth)}`} value={`${position.contracts} 口`} detail={`平均進場 ${number.format(position.averageEntryPoint)} 點`} tone="violet" />)}
      </section>
      <form onSubmit={updateSafetyMargin} className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/[.06] p-5">
        <p className="text-xs font-black tracking-[.18em] text-amber-300">FUTURES・TMF</p>
        <h3 className="mt-1 text-lg font-black text-white">微型臺指期安全保證金</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><NumberField label="微臺每口安全保證金" prefix="NT$" value={safetyMargin} min="1" step="1" onChange={setSafetyMargin} /><p className="mt-2 text-xs leading-5 text-slate-400">請填期貨商目前要求的原始保證金或更高金額；更新後會套用到下一筆微臺加碼檢查。</p></div>
          {actionError ? <InlineError message={actionError} /> : null}
          <button disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3.5 font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-60">{busy ? "更新中…" : "更新安全門檻"}</button>
        </div>
      </form>
    </>
  );
}

function TradeForm({ ledger, busy, onBusy, onComplete, onError }: {
  ledger: SpotFuturesLedgerSnapshot;
  busy: boolean;
  onBusy: (value: "trade") => void;
  onComplete: (ledger: SpotFuturesLedgerSnapshot, message: string) => Promise<void>;
  onError: () => void;
}) {
  const [instrument, setInstrument] = useState<"0050" | "TMF">("0050");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"shares" | "lots">("lots");
  const [price, setPrice] = useState("");
  const [month, setMonth] = useState(ledger.inventory.futuresPositions[0]?.contractMonth.replace(/^(\d{4})(\d{2})$/, "$1-$2") ?? "");
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue());
  const [actionError, setActionError] = useState("");
  const actualQuantity = instrument === "0050" && unit === "lots" ? Number(quantity) * 1000 : Number(quantity);
  const preview = useMemo(() => {
    const numericPrice = Number(price);
    if (!(actualQuantity > 0 && numericPrice > 0)) return { gross: 0, fee: 0, tax: 0 };
    const gross = instrument === "0050" ? actualQuantity * numericPrice : actualQuantity * numericPrice * 10;
    const fee = instrument === "0050" ? calculateStockFee(gross, ledger.account.stockFeeRate) : actualQuantity * ledger.account.futuresFeePerContract;
    const tax = instrument === "0050" ? (side === "sell" ? calculateEtfSellTax(gross) : 0) : calculateFuturesTax(numericPrice, actualQuantity);
    return { gross, fee, tax };
  }, [actualQuantity, instrument, ledger.account.futuresFeePerContract, ledger.account.stockFeeRate, price, side]);
  const marginPreview = useMemo(() => {
    const currentContracts = ledger.inventory.futuresPositions.reduce((sum, position) => sum + position.contracts, 0);
    const validTrade = instrument === "TMF" && side === "buy" && Number.isInteger(actualQuantity) && actualQuantity > 0 && Number(price) > 0;
    if (!validTrade) return { ready: false, contractsAfter: currentContracts, required: 0, estimatedBalance: ledger.inventory.futuresBalance, buffer: 0, insufficient: false };
    const contractsAfter = currentContracts + actualQuantity;
    const required = contractsAfter * ledger.account.futuresSafetyMarginPerContract;
    const estimatedBalance = ledger.inventory.futuresBalance - preview.fee - preview.tax;
    const buffer = estimatedBalance - required;
    return { ready: true, contractsAfter, required, estimatedBalance, buffer, insufficient: buffer < 0 };
  }, [actualQuantity, instrument, ledger.account.futuresSafetyMarginPerContract, ledger.inventory.futuresBalance, ledger.inventory.futuresPositions, preview.fee, preview.tax, price, side]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); onBusy("trade");
    try {
      const response = await fetch("/api/spot-futures/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: crypto.randomUUID(), instrument, side, quantity: actualQuantity, price: Number(price),
          contractMonth: instrument === "TMF" ? month.replace("-", "") : undefined,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法新增交易。");
      setQuantity(""); setPrice("");
      await onComplete(data.ledger, data.message);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "無法新增交易。");
      onError();
    }
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
      <p className="text-xs font-black tracking-[.18em] text-teal-300">NEW TRANSACTION</p><h2 className="mt-2 text-2xl font-black text-white">新增買賣</h2>
      <form className="mt-6 space-y-5" onSubmit={submit}>
        <div role="tablist" aria-label="選擇交易商品" className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2">
          <button
            id="trade-spot-tab"
            type="button"
            role="tab"
            aria-selected={instrument === "0050"}
            aria-controls="trade-spot-panel"
            tabIndex={instrument === "0050" ? 0 : -1}
            onClick={() => setInstrument("0050")}
            className={`rounded-xl px-3 py-3 text-sm font-black transition sm:text-base ${instrument === "0050" ? "bg-sky-300 text-slate-950 shadow-lg shadow-sky-950/20" : "text-slate-400 hover:bg-white/5 hover:text-sky-200"}`}
          >
            0050 現股
          </button>
          <button
            id="trade-futures-tab"
            type="button"
            role="tab"
            aria-selected={instrument === "TMF"}
            aria-controls="trade-futures-panel"
            tabIndex={instrument === "TMF" ? 0 : -1}
            onClick={() => setInstrument("TMF")}
            className={`rounded-xl px-3 py-3 text-sm font-black transition sm:text-base ${instrument === "TMF" ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/20" : "text-slate-400 hover:bg-white/5 hover:text-amber-200"}`}
          >
            微型臺指期
          </button>
        </div>
        {instrument === "0050" ? (
          <section id="trade-spot-panel" role="tabpanel" aria-labelledby="trade-spot-tab" className="rounded-3xl border border-sky-300/35 bg-sky-300/[.08] p-5 shadow-lg shadow-sky-950/20">
            <div><p className="text-xs font-black tracking-[.18em] text-sky-300">SPOT・0050</p><h3 className="mt-1 text-xl font-black text-white">0050 現股交易</h3></div>
              <div className="mt-5 grid grid-cols-2 gap-3">{(["buy", "sell"] as const).map((value) => <button key={value} type="button" onClick={() => setSide(value)} className={`rounded-2xl px-4 py-3 font-bold ${side === value ? (value === "buy" ? "bg-sky-400 text-slate-950" : "bg-orange-400 text-slate-950") : "bg-slate-800 text-slate-300"}`}>{value === "buy" ? "買進0050" : "賣出0050"}</button>)}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField label={unit === "lots" ? "張數" : "股數"} value={quantity} min="1" step="1" onChange={setQuantity} />
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">輸入單位</span><select value={unit} onChange={(event) => setUnit(event.target.value as "shares" | "lots")} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 font-semibold text-white outline-none"><option value="lots">張（1張＝1,000股）</option><option value="shares">股</option></select></label>
                <NumberField label="每股成交價" prefix="NT$" value={price} min="0.01" step="0.01" onChange={setPrice} />
                <DateTimeField label="0050 成交時間" value={occurredAt} onChange={setOccurredAt} />
              </div>
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[.07] p-4 text-sm text-sky-100">
                {unit === "lots" ? <p className="mb-2 flex justify-between"><span>換算股數</span><strong>{Number.isFinite(actualQuantity) ? actualQuantity.toLocaleString("zh-TW") : "0"} 股</strong></p> : null}
                <p className="flex justify-between"><span>成交金額</span><strong>{money.format(preview.gross)}</strong></p>
                <p className="mt-2 flex justify-between"><span>手續費</span><strong>{money.format(preview.fee)}</strong></p>
                <p className="mt-2 flex justify-between"><span>交易稅</span><strong>{money.format(preview.tax)}</strong></p>
              </div>
          </section>
        ) : (
          <section id="trade-futures-panel" role="tabpanel" aria-labelledby="trade-futures-tab" className="rounded-3xl border border-amber-300/35 bg-amber-300/[.08] p-5 shadow-lg shadow-amber-950/20">
            <div><p className="text-xs font-black tracking-[.18em] text-amber-300">FUTURES・TMF</p><h3 className="mt-1 text-xl font-black text-white">微型臺指期交易</h3></div>
              <div className="mt-5 grid grid-cols-2 gap-3">{(["buy", "sell"] as const).map((value) => <button key={value} type="button" onClick={() => setSide(value)} className={`rounded-2xl px-4 py-3 font-bold ${side === value ? (value === "buy" ? "bg-amber-300 text-slate-950" : "bg-orange-400 text-slate-950") : "bg-slate-800 text-slate-300"}`}>{value === "buy" ? "買進微臺" : "平倉微臺"}</button>)}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumberField label="口數" value={quantity} min="1" step="1" onChange={setQuantity} />
                <MonthField label="契約月份" value={month} onChange={setMonth} />
                <NumberField label="成交點位" value={price} min="0.01" step="0.01" onChange={setPrice} />
                <DateTimeField label="微臺成交時間" value={occurredAt} onChange={setOccurredAt} />
              </div>
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.07] p-4 text-sm text-amber-100">
                <p className="flex justify-between"><span>稅基契約金額</span><strong>{money.format(preview.gross)}</strong></p>
                <p className="mt-2 flex justify-between"><span>手續費</span><strong>{money.format(preview.fee)}</strong></p>
                <p className="mt-2 flex justify-between"><span>交易稅</span><strong>{money.format(preview.tax)}</strong></p>
              </div>
              {side === "buy" ? <div role={marginPreview.insufficient ? "alert" : "status"} className={`mt-4 flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${marginPreview.insufficient ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/[.08] text-emerald-200"}`}>
                {marginPreview.ready
                  ? marginPreview.insufficient
                    ? `安全保證金不足：交易後 ${marginPreview.contractsAfter.toLocaleString("zh-TW")} 口至少需保留 ${money.format(marginPreview.required)}，預估尚缺 ${money.format(Math.abs(marginPreview.buffer))}。`
                    : `交易後 ${marginPreview.contractsAfter.toLocaleString("zh-TW")} 口需保留 ${money.format(marginPreview.required)}，預估安全緩衝 ${money.format(marginPreview.buffer)}。`
                  : `每口安全保證金 ${money.format(ledger.account.futuresSafetyMarginPerContract)}；輸入口數與點位後會立即試算。`}
              </div> : null}
          </section>
        )}
        <div className={`grid gap-3 ${actionError ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch" : ""}`}>
          {actionError ? <InlineError message={actionError} /> : null}
          <button disabled={busy || marginPreview.insufficient} className={`w-full rounded-2xl px-5 py-4 font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36 ${instrument === "0050" ? "bg-sky-300 hover:bg-sky-200" : "bg-amber-300 hover:bg-amber-200"}`}>{busy ? "記錄中…" : `確認${side === "buy" ? "買進" : instrument === "TMF" ? "平倉" : "賣出"}${instrument === "0050" ? "0050" : "微臺"}`}</button>
        </div>
      </form>
    </section>
  );
}

function FundsUpdateForm({ ledger, busy, onBusy, onComplete, onError }: {
  ledger: SpotFuturesLedgerSnapshot;
  busy: boolean;
  onBusy: (value: "funds") => void;
  onComplete: (ledger: SpotFuturesLedgerSnapshot, message: string) => Promise<void>;
  onError: () => void;
}) {
  const [securitiesCash, setSecuritiesCash] = useState(String(ledger.inventory.securitiesCash));
  const [futuresBalance, setFuturesBalance] = useState(String(ledger.inventory.futuresBalance));
  const [actionError, setActionError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); onBusy("funds");
    try {
      const response = await fetch("/api/spot-futures/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securitiesCash: Number(securitiesCash), futuresBalance: Number(futuresBalance) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "無法更新帳戶資金。");
      await onComplete(data.ledger, data.message);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "無法更新帳戶資金。");
      onError();
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
      <p className="text-xs font-black tracking-[.18em] text-teal-300">ACCOUNT FUNDS</p>
      <h2 className="mt-2 text-2xl font-black text-white">修改帳戶資金</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">輸入目前實際可用的金額；系統只調整資金，不會改動0050股數、微臺口數或交易紀錄。</p>
      <form className="mt-5 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-sky-300/20 bg-sky-300/[.05] p-4">
            <p className="text-xs font-black tracking-[.16em] text-sky-300">SPOT・0050</p>
            <div className="mt-3"><NumberField label="台股現金" prefix="NT$" value={securitiesCash} min="0" step="1" onChange={setSecuritiesCash} /></div>
            <p className="mt-2 text-xs leading-5 text-slate-400">目前可用於買進0050的證券帳戶現金。</p>
          </section>
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-4">
            <p className="text-xs font-black tracking-[.16em] text-amber-300">FUTURES・TMF</p>
            <div className="mt-3"><NumberField label="期貨保證金資金" prefix="NT$" value={futuresBalance} min="0" step="1" onChange={setFuturesBalance} /></div>
            <p className="mt-2 text-xs leading-5 text-slate-400">填入期貨帳戶資金；未實現損益會另外計入保證金權益。</p>
          </section>
        </div>
        <div className={`grid gap-3 ${actionError ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch" : ""}`}>
          {actionError ? <InlineError message={actionError} /> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-teal-300 px-5 py-4 font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-60">{busy ? "更新中…" : "確認修改資金"}</button>
        </div>
      </form>
    </section>
  );
}

function ValuationPanel({ valuation, busy, error, onRefresh }: { valuation: ValuationResponse | null; busy: boolean; error: string; onRefresh: () => void }) {
  const quoteDates = valuation ? [valuation.quotes.spot?.quoteDate, ...valuation.quotes.futures.map((quote) => quote.quoteDate)].filter(Boolean) : [];
  const mixedDates = new Set(quoteDates).size > 1;
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black tracking-[.18em] text-violet-300">NOMINAL EXPOSURE</p><h2 className="mt-2 text-2xl font-black text-white">目前名目曝險</h2></div>{valuation?.valuation ? <span className={`rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${riskTone(valuation.valuation.level)}`}>{valuation.valuation.level}</span> : null}</div>
      <div className={`mt-5 grid gap-3 ${error ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch" : ""}`}>
        {error ? <InlineError message={error} /> : null}
        <button type="button" onClick={onRefresh} disabled={busy} className="w-full rounded-2xl border border-violet-300/30 bg-violet-300/10 px-5 py-3.5 font-bold text-violet-100 hover:bg-violet-300/20 disabled:opacity-50">{busy ? "取得官方行情中…" : "更新行情並計算曝險"}</button>
      </div>
      {!valuation?.valuation ? <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">{valuation?.missingQuotes.length ? `尚缺少 ${valuation.missingQuotes.join("、")} 行情，請按上方按鈕更新。` : "目前尚無可顯示的估值。"}</p> : <>
        <ExposureGauge ratio={valuation.valuation.exposureRatio} label="0050 + TMF EXPOSURE" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Metric label="總名目曝險" value={money.format(valuation.valuation.exposureNotional)} tone="violet" />
          <Metric label="淨資產" value={money.format(valuation.valuation.netAssets)} tone="teal" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="spot-valuation-heading" className="rounded-3xl border border-sky-300/15 bg-sky-300/[.04] p-4 sm:p-5">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-sky-300">SPOT・0050</p>
              <h3 id="spot-valuation-heading" className="mt-1 text-xl font-black text-white">現股</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Metric label="0050 市值" value={money.format(valuation.valuation.spotMarketValue)} detail={valuation.quotes.spot ? `${number.format(valuation.quotes.spot.price)} 元・${valuation.quotes.spot.quoteDate}` : "目前無 0050 庫存"} tone="sky" />
              <Metric label="0050 未實現損益" value={signedMoney(valuation.valuation.spotUnrealizedProfitLoss)} tone={valuation.valuation.spotUnrealizedProfitLoss < 0 ? "rose" : "emerald"} />
              <Metric label="現股可用資金" value={money.format(valuation.ledger.inventory.securitiesCash)} detail="可用於 0050 買進" tone="teal" />
            </div>
          </section>
          <section aria-labelledby="futures-valuation-heading" className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-4 sm:p-5">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-amber-300">FUTURES・TMF</p>
              <h3 id="futures-valuation-heading" className="mt-1 text-xl font-black text-white">期貨</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Metric label="微臺名目曝險" value={money.format(valuation.valuation.futuresNotional)} tone="amber" />
              <Metric label="微臺未實現損益" value={signedMoney(valuation.valuation.futuresUnrealizedProfitLoss)} tone={valuation.valuation.futuresUnrealizedProfitLoss < 0 ? "rose" : "emerald"} />
              <Metric label="保證金權益" value={money.format(valuation.valuation.futuresMarginEquity)} detail="期貨帳本資金＋未實現損益" tone="amber" />
              <Metric label="安全保證金需求" value={money.format(valuation.valuation.futuresSafetyMarginRequired)} detail={`每口 ${money.format(valuation.ledger.account.futuresSafetyMarginPerContract)}`} tone="slate" />
              <Metric label="保證金安全緩衝" value={signedMoney(valuation.valuation.futuresMarginBuffer)} detail="保證金權益－安全需求" tone={valuation.valuation.futuresMarginBuffer < 0 ? "rose" : "emerald"} />
              <Metric label="行情月份" value={valuation.quotes.futures.length ? `${valuation.quotes.futures.length} 個契約` : "無微臺庫存"} detail={valuation.quotes.futures.map((quote) => `${formatMonth(quote.contractMonth)} ${number.format(quote.price)} 點・正式結算價・${quote.quoteDate}`).join("｜")} tone="slate" />
            </div>
          </section>
        </div>
        {valuation.valuation.futuresMarginBuffer < 0 ? <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/[.1] p-4 text-sm font-semibold leading-6 text-rose-100">目前保證金權益低於你設定的安全門檻，系統會阻擋新增微臺部位；請核對券商權益數並考慮補入資金或降低部位。</p> : null}
        {mixedDates ? <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/[.08] p-4 text-sm leading-6 text-amber-100">持倉行情日期不同，時速表已依各卡片標示的保存行情計算，請留意並非同一時間點。</p> : null}
      </>}
      <p className="mt-5 rounded-2xl border border-orange-300/15 bg-orange-300/[.06] p-4 text-xs leading-6 text-slate-400">0050 與臺指期追蹤標的不完全相同。微臺只採用期交所最新已公布的一般盤正式結算價，不讀取最後成交價或盤後價；系統不會自動換月。</p>
    </section>
  );
}

function TransactionHistory({ ledger }: { ledger: SpotFuturesLedgerSnapshot }) {
  return (
    <section className="mt-7 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
      <p className="text-xs font-black tracking-[.18em] text-orange-300">HISTORY</p><h2 className="mt-2 text-2xl font-black text-white">交易紀錄</h2>
      {ledger.transactions.length === 0 ? <p className="mt-5 text-sm text-slate-400">尚無起始庫存或交易紀錄。</p> : <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-800/70 text-slate-300"><tr><Th>時間</Th><Th>類型</Th><Th>商品</Th><Th>方向</Th><Th right>數量</Th><Th right>價格</Th><Th right>手續費／稅</Th><Th right>本次已實現</Th><Th right>交易後庫存</Th><Th right>交易後均價</Th></tr></thead><tbody className="divide-y divide-white/10">{ledger.transactions.map((record) => <tr key={record.id} className="text-slate-200"><Td>{formatTaipeiDateTime(record.occurredAt)}</Td><Td>{record.kind === "opening" ? "起始" : "交易"}</Td><Td>{record.instrument === "TMF" ? `TMF ${formatMonth(record.contractMonth ?? "")}` : "0050"}</Td><Td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.side === "buy" ? "bg-sky-400/10 text-sky-300" : "bg-orange-400/10 text-orange-300"}`}>{record.kind === "opening" ? "庫存" : record.side === "buy" ? "買進" : record.instrument === "TMF" ? "平倉" : "賣出"}</span></Td><Td right>{record.quantity.toLocaleString("zh-TW")} {record.instrument === "0050" ? "股" : "口"}</Td><Td right>{number.format(record.price)}</Td><Td right>{money.format(record.fee)}／{money.format(record.tax)}</Td><Td right>{signedMoney(record.realizedProfitLoss)}</Td><Td right>{record.positionQuantityAfter.toLocaleString("zh-TW")}</Td><Td right>{number.format(record.averageCostAfter)}</Td></tr>)}</tbody></table></div>}
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  return <p role="alert" className="flex items-center rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold leading-6 text-rose-200">{message}</p>;
}

function NumberField({ label, prefix, value, min, step, required = true, onChange }: { label: string; prefix?: string; value: string; min: string; step: string; required?: boolean; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span><div className="input-frame flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/10">{prefix ? <span className="text-slate-500">{prefix}</span> : null}<input required={required} type="number" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border-0 bg-transparent px-2 py-3.5 font-semibold text-white outline-none focus:ring-0" /></div></label>; }
function MonthField({ label, value, required = true, onChange }: { label: string; value: string; required?: boolean; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span><input required={required} type="month" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 font-semibold text-white outline-none focus:border-teal-400" /></label>; }
function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span><input required type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 font-semibold text-white outline-none focus:border-teal-400" /></label>; }
function Metric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "violet" | "teal" | "sky" | "amber" | "emerald" | "rose" | "slate" }) { const colors = { violet: "border-violet-400/20 bg-violet-400/[.07] text-violet-200", teal: "border-teal-400/20 bg-teal-400/[.07] text-teal-200", sky: "border-sky-400/20 bg-sky-400/[.07] text-sky-200", amber: "border-amber-400/20 bg-amber-400/[.07] text-amber-200", emerald: "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-200", rose: "border-rose-400/20 bg-rose-400/[.07] text-rose-200", slate: "border-white/10 bg-slate-950/60 text-slate-200" }; return <div className={`rounded-2xl border p-4 ${colors[tone]}`}><p className="text-xs font-bold tracking-wider opacity-70">{label}</p><p className="mt-2 text-xl font-black">{value}</p>{detail ? <p className="mt-1 text-[11px] leading-5 opacity-70">{detail}</p> : null}</div>; }
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) { return <th scope="col" className={`px-4 py-3 font-semibold ${right ? "text-right" : ""}`}>{children}</th>; }
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) { return <td className={`whitespace-nowrap px-4 py-3 ${right ? "text-right" : ""}`}>{children}</td>; }
function formatMonth(value: string) { return /^\d{6}$/.test(value) ? `${value.slice(0, 4)}/${value.slice(4)}` : value; }
function formatTaipeiDateTime(value: string) { const parts = Object.fromEntries(taipeiDateTimeParts.formatToParts(new Date(value)).map((part) => [part.type, part.value])); return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`; }
function signedMoney(value: number) { const sign = value > 0 ? "+" : value < 0 ? "−" : ""; return `${sign}${money.format(Math.abs(value))}`; }
