"use client";

import { FormEvent, useState } from "react";

export default function ExposurePage() {
  const [investment, setInvestment] = useState("0");
  const [cash, setCash] = useState("0");
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setSaveStatus(null);
    try {
      const response = await fetch("/api/exposure/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investment: Number(investment), cash: Number(cash) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "計算失敗，請稍後再試。");
      setSaveStatus({ type: "success", message: data.message ?? "已成功儲存暴險紀錄。" });
    } catch (reason) {
      setSaveStatus({ type: "error", message: reason instanceof Error ? reason.message : "計算失敗，請稍後再試。" });
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(249,115,22,.13),transparent_31%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <div className="flex flex-1 items-center justify-center py-10"><section className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <p className="mb-2 text-sm font-bold tracking-[.18em] text-teal-300">POSITION INPUT</p><h2 className="text-3xl font-bold tracking-tight text-white">你的台股實質暴險</h2><p className="mt-3 leading-7 text-slate-400">輸入 00631L 市值與可用現金，作為起始資金設定。</p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">00631L 投資金額</span><div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/10"><span className="text-slate-500">NT$</span><input required className="w-full bg-transparent px-3 py-4 text-lg font-semibold outline-none" type="number" min="0" step="1" value={investment} onChange={(event) => setInvestment(event.target.value)} /></div></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">現金</span><div className="flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/10"><span className="text-slate-500">NT$</span><input required className="w-full bg-transparent px-3 py-4 text-lg font-semibold outline-none" type="number" min="0" step="1" value={cash} onChange={(event) => setCash(event.target.value)} /></div></label>
            {saveStatus && <p className={`rounded-xl px-4 py-3 text-sm ${saveStatus.type === "success" ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>{saveStatus.message}</p>}
            <button className="w-full rounded-2xl bg-teal-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-70" disabled={loading}>{loading ? "儲存中…" : "儲存起始設定"}</button>
          </form>
        </section></div>
      </div>
    </main>
  );
}
