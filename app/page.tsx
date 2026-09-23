import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "00631L × 0050＋微臺｜台股曝險控制台",
  description: "用同一套風險視角管理 00631L，或整合 0050 現貨與微型臺指期貨，一眼掌握淨資產、名目曝險、保證金水位與交易損益。",
};

const features = [
  { eyebrow: "ONE RATIO", title: "現貨與期貨放在同一把尺", description: "把 0050 市值與微臺名目金額合併，再除以包含現金與期貨損益的淨資產，曝險不再分散在兩個帳戶。", accent: "teal", icon: "Σ" },
  { eyebrow: "MARGIN", title: "看見保證金緩衝", description: "除了口數與未實現損益，也呈現期貨權益、安全保證金需求與剩餘緩衝，讓加碼前先看承受空間。", accent: "sky", icon: "M" },
  { eyebrow: "LEDGER", title: "每筆交易都有脈絡", description: "0050 與不同月份的微臺分開彙整庫存、均價、費稅與已實現損益，保留可追溯的帳本紀錄。", accent: "orange", icon: "↗" },
];

const steps = [
  ["01", "建立兩邊的起始帳本", "輸入 0050 庫存、證券現金、微臺月份、口數、進場點位與期貨資金。"],
  ["02", "持續記錄實際成交", "買賣現貨或微臺時，分別更新現金、庫存、均價、費稅與已實現損益。"],
  ["03", "更新行情再看曝險", "手動取得並保存 0050 與微臺行情，用同一張時速表檢查曝險和保證金緩衝。"],
];

export default async function LandingPage() {
  const session = await readSession();
  const loginHref = "/login";
  const futuresHref = session ? "/spot-futures" : loginHref;
  const exposureHref = session ? "/dashboard" : loginHref;

  return (
    <main className="cosmic-home overflow-hidden bg-slate-950 text-slate-100">
      <section className="cosmic-hero relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,.17),transparent_28%),radial-gradient(circle_at_85%_30%,rgba(249,115,22,.14),transparent_27%),linear-gradient(to_bottom,transparent,rgba(2,6,23,.9))]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/8 px-3 py-1.5 text-xs font-bold tracking-[.12em] text-orange-200">
              <span className="size-1.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,.9)]" />0050 現貨 × 微型臺指期貨
            </div>
            <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-.04em] text-white sm:text-6xl lg:text-[4.25rem]">
              別分開看帳戶，<br />看懂你真正承擔的
              <span className="mt-2 block bg-gradient-to-r from-orange-300 via-amber-200 to-teal-300 bg-clip-text text-transparent">整體台股曝險。</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">整合 0050 持股、證券現金、微臺部位、期貨資金與損益，讓現貨和期貨回到同一個淨資產視角。</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={futuresHref} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_14px_40px_rgba(251,146,60,.2)] transition hover:-translate-y-0.5 hover:bg-orange-200">{session ? "前往 0050＋微臺時速表" : "登入開始使用"}<span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></Link>
              <Link href="#models" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/12 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/[.08]">比較兩種管理模式</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2"><CheckIcon />0050 與微臺合併曝險</span>
              <span className="flex items-center gap-2"><CheckIcon />每位使用者獨立帳本</span>
              <span className="flex items-center gap-2"><CheckIcon />不連接券商帳戶</span>
            </div>
          </div>
          <div className="cosmic-visual">
            <div className="cosmic-visual-art" aria-hidden="true" />
            <SpotFuturesPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-white/[.025] px-5 py-7 sm:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:divide-x sm:divide-white/10">
          <Stat value="1 張" label="現貨、期貨與現金同畫面" /><Stat value="×10" label="微臺每點契約乘數" /><Stat value="手動" label="取得行情後才更新資料庫" />
        </div>
      </section>

      <section id="models" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="TWO FOCUSED MODELS" title="選擇符合你部位的管理方式" description="兩套帳本各自保留交易邏輯與風險語意；你可以只使用其中一套，也可以分別管理。" />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <StrategyCard eyebrow="LEVERAGED ETF" title="00631L 曝險控制" description="適合以 00631L 為主要部位，想把 2 倍名目曝險、現金、成本與交易損益放在一起管理。" items={["2 倍名目曝險估算", "買賣費稅與移動成本", "已實現與未實現損益"]} href={exposureHref} cta={session ? "開啟 00631L 時速表" : "登入後使用"} tone="teal" />
            <StrategyCard eyebrow="SPOT + FUTURES" title="0050＋微臺整體曝險" description="適合用 0050 建立現貨底倉，再以微型臺指期貨調整曝險，並關注期貨資金安全空間。" items={["多月份微臺部位分開彙整", "淨資產與整體名目曝險", "保證金權益與安全緩衝"]} href={futuresHref} cta={session ? "開啟 0050＋微臺時速表" : "登入後使用"} tone="orange" />
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-y border-white/[.07] bg-slate-900/45 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="WHY IT MATTERS" title="期貨口數不大，名目曝險可能很大" description="只看保證金餘額，容易低估整體市場曝險。把現貨市值、期貨契約價值與淨資產放在一起，才有一致的風險尺度。" />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">{features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}</div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="SIMPLE WORKFLOW" title="三步驟，建立跨帳戶的曝險紀律" description="從目前庫存開始，不必匯入券商帳密；之後只記錄實際成交與資金變動。" />
          <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
            <div className="absolute left-[16.67%] right-[16.67%] top-7 hidden h-px bg-gradient-to-r from-orange-300/10 via-orange-300/70 to-teal-300/10 lg:block" />
            {steps.map(([number, title, description]) => <article key={number} className="relative rounded-2xl border border-white/[.08] bg-slate-950/75 p-6"><div className="relative z-10 grid size-14 place-items-center rounded-2xl border border-orange-300/25 bg-orange-300/10 font-mono text-sm font-black text-orange-200">{number}</div><h3 className="mt-6 text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-slate-900/45 px-5 py-20 sm:px-8 lg:py-28">
        <div className="landing-risk-panel mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,.95),rgba(67,20,7,.38))] p-7 sm:p-10 lg:grid-cols-[1fr_.95fr] lg:p-14">
          <div><p className="text-xs font-black tracking-[.2em] text-orange-300">RISK BEFORE RETURN</p><h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">加碼之前，先確認淨資產撐得住多少曝險。</h2><p className="mt-5 max-w-xl leading-8 text-slate-300">0050 與微臺的價格只是計算起點。真正需要一起看的，是現貨市值、期貨名目金額、未實現損益、可用資金與保證金緩衝。</p><div className="mt-7 flex flex-wrap gap-2 text-sm">{["現貨期貨合併", "多月份分帳", "費稅完整留痕", "安全緩衝提示"].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-slate-300">{item}</span>)}</div></div>
          <div className="space-y-4">
            <RiskNote title="0050＋微臺" tone="orange">微臺名目金額以口數 × 指數點數 × NT$10 估算；保證金不是最大損失。行情採系統已儲存的 0050 價格與微臺一般盤正式結算價，使用者仍需注意行情時間、契約到期與換月。</RiskNote>
            <RiskNote title="00631L" tone="teal">00631L 持股市值乘以 2 僅為名目曝險估算。槓桿 ETF 的跨日績效仍會受到每日再平衡、波動耗損、追蹤差異與折溢價影響。</RiskNote>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-orange-300/20 bg-orange-300/[.07] px-6 py-12 text-center sm:px-12 sm:py-16"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(251,146,60,.22),transparent_48%)]" /><div className="relative"><p className="text-xs font-black tracking-[.2em] text-orange-200">START WITH THE WHOLE PICTURE</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">讓現貨與期貨，回到同一張風險地圖。</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">先建立目前庫存與資金，幾分鐘內看見淨資產、名目曝險和保證金緩衝的完整關係。</p><Link href={futuresHref} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-300 px-7 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-200">{session ? "前往 0050＋微臺時速表" : "登入開始使用"}</Link><p className="mt-5 text-xs text-slate-500">本工具提供試算與紀錄，不構成任何投資建議。</p></div></div>
      </section>
    </main>
  );
}

function SpotFuturesPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div className="absolute -inset-8 -z-10 rounded-full bg-orange-400/10 blur-3xl" />
      <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-900/85 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div><p className="text-[10px] font-black tracking-[.17em] text-orange-300">COMBINED EXPOSURE</p><p className="mt-1 text-sm font-bold text-white">0050＋微臺部位總覽</p></div><span className="rounded-full bg-orange-300/10 px-3 py-1 text-[10px] font-bold text-orange-200 ring-1 ring-orange-300/20">高曝險</span></div>
        <div className="p-5 sm:p-6">
          <div className="landing-exposure-panel rounded-2xl border border-white/[.08] bg-slate-950/65 p-5"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-black tracking-[.16em] text-slate-500">EFFECTIVE EXPOSURE</p><p className="mt-2 text-4xl font-black tracking-tight text-white">138.6%</p></div><div className="text-right"><p className="text-[9px] font-bold text-slate-500">淨資產</p><p className="mt-1 text-sm font-black text-teal-200">NT$ 1,040K</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-[69.3%] rounded-full bg-gradient-to-r from-teal-300 via-amber-300 to-orange-400" /></div><div className="mt-2 flex justify-between text-[9px] text-slate-600"><span>0%</span><span>200%+</span></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2.5"><PreviewMetric label="0050 市值" value="NT$ 720K" tone="teal" /><PreviewMetric label="微臺名目" value="NT$ 721K" tone="orange" /><PreviewMetric label="期貨權益" value="NT$ 228K" tone="sky" /><PreviewMetric label="安全緩衝" value="+NT$ 28K" tone="emerald" /></div>
        </div>
        <div className="flex items-center justify-between border-t border-white/[.07] bg-black/10 px-5 py-3 text-[10px] text-slate-500"><span>示意數據</span><span>已儲存行情重新估值</span></div>
      </div>
      <div className="absolute -bottom-5 -left-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 shadow-xl sm:-left-8"><p className="text-[9px] font-bold tracking-wider text-slate-500">現貨與期貨</p><p className="mt-1 text-xs font-bold text-orange-200">同一張風險地圖</p></div>
    </div>
  );
}

function StrategyCard({ eyebrow, title, description, items, href, cta, tone }: { eyebrow: string; title: string; description: string; items: string[]; href: string; cta: string; tone: "teal" | "orange" }) {
  const styles = tone === "teal" ? { eyebrow: "text-teal-300", border: "hover:border-teal-300/30", dot: "bg-teal-300", button: "bg-teal-300 hover:bg-teal-200" } : { eyebrow: "text-orange-300", border: "hover:border-orange-300/30", dot: "bg-orange-300", button: "bg-orange-300 hover:bg-orange-200" };
  return <article className={`flex flex-col rounded-3xl border border-white/[.08] bg-slate-900/55 p-7 transition hover:-translate-y-1 ${styles.border}`}><p className={`text-[10px] font-black tracking-[.2em] ${styles.eyebrow}`}>{eyebrow}</p><h3 className="mt-3 text-2xl font-black text-white">{title}</h3><p className="mt-4 text-sm leading-7 text-slate-400">{description}</p><ul className="mt-6 flex-1 space-y-3">{items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-slate-300"><span className={`size-1.5 rounded-full ${styles.dot}`} />{item}</li>)}</ul><Link href={href} className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-slate-950 transition ${styles.button}`}>{cta}</Link></article>;
}

function RiskNote({ title, tone, children }: { title: string; tone: "teal" | "orange"; children: ReactNode }) {
  const style = tone === "teal" ? "border-teal-300/15 bg-teal-300/[.06] text-teal-200" : "border-orange-300/15 bg-orange-300/[.06] text-orange-200";
  return <div className={`rounded-2xl border p-6 ${style}`}><p className="text-sm font-bold">{title} 重要說明</p><p className="mt-3 text-sm leading-7 text-slate-300">{children}</p></div>;
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: "teal" | "orange" | "sky" | "emerald" }) {
  const styles = { teal: "border-teal-300/15 bg-teal-300/[.06] text-teal-200", orange: "border-orange-300/15 bg-orange-300/[.06] text-orange-200", sky: "border-sky-300/15 bg-sky-300/[.06] text-sky-200", emerald: "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200" };
  return <div className={`rounded-xl border p-3 ${styles[tone]}`}><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1 whitespace-nowrap text-xs font-black sm:text-sm">{value}</p></div>;
}

function FeatureCard({ eyebrow, title, description, accent, icon }: { eyebrow: string; title: string; description: string; accent: string; icon: string }) {
  const styles: Record<string, string> = { teal: "border-teal-300/15 bg-teal-300/[.055] text-teal-200", sky: "border-sky-300/15 bg-sky-300/[.055] text-sky-200", orange: "border-orange-300/15 bg-orange-300/[.055] text-orange-200" };
  return <article className="rounded-3xl border border-white/[.08] bg-slate-900/55 p-6 transition hover:-translate-y-1 hover:border-white/15"><div className={`grid size-12 place-items-center rounded-2xl border font-mono text-sm font-black ${styles[accent]}`}>{icon}</div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-slate-500">{eyebrow}</p><h3 className="mt-2 text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="max-w-3xl"><p className="text-xs font-black tracking-[.2em] text-orange-300">{eyebrow}</p><h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h2><p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">{description}</p></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="px-4 py-2"><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 text-orange-300"><circle cx="10" cy="10" r="9" fill="currentColor" fillOpacity=".12" /><path d="m6.5 10 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
