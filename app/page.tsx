import type { Metadata } from "next";
import Link from "next/link";
import { readSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "看懂真正承擔的台股曝險",
  description: "整合 00631L 持股、現金、交易費稅與最近儲存的價格，一眼掌握名目曝險比例、持股成本與整體損益。",
};

const features = [
  { eyebrow: "EXPOSURE", title: "看見真正的曝險", description: "把 00631L 持股市值換算為 2 倍名目曝險，再與現金及整體資產一起衡量，不再只看庫存金額。", accent: "teal", icon: "02" },
  { eyebrow: "CASH", title: "現金水位一起算", description: "同步追蹤可用現金與部位價值，當你加碼或減碼時，曝險比例會跟著重新計算。", accent: "sky", icon: "$" },
  { eyebrow: "ACCOUNTING", title: "費稅與損益不漏算", description: "依台灣 ETF 交易情境估算手續費與賣出交易稅，分開呈現已實現、未實現與總損益。", accent: "orange", icon: "%" },
];

const steps = [
  ["01", "建立起始部位", "輸入既有 00631L 股數、持股成本與可用現金。"],
  ["02", "記錄每次買賣", "新增股數與成交價，系統同步更新成本、現金與持股。"],
  ["03", "每天檢查曝險", "手動取得盤中成交價重新估值，快速判斷是否需要調整部位。"],
];

export default async function LandingPage() {
  const session = await readSession();
  const primaryHref = session ? "/dashboard" : "/register";
  const primaryLabel = session ? "前往我的儀表板" : "免費建立曝險儀表板";

  return (
    <main className="overflow-hidden bg-slate-950 text-slate-100">
      <section className="relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,.17),transparent_28%),radial-gradient(circle_at_85%_30%,rgba(249,115,22,.12),transparent_26%),linear-gradient(to_bottom,transparent,rgba(2,6,23,.9))]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/8 px-3 py-1.5 text-xs font-bold tracking-[.12em] text-teal-200">
              <span className="size-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,.9)]" />專為 00631L 投資者設計
            </div>
            <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-.04em] text-white sm:text-6xl lg:text-[4.25rem]">
              別只看損益，<br />看懂你真正承擔的
              <span className="mt-2 block bg-gradient-to-r from-teal-300 via-emerald-300 to-sky-300 bg-clip-text text-transparent">台股曝險。</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">整合 00631L 持股、可用現金、交易費稅與最近儲存的價格，讓每一次加碼與減碼，都有清楚的風險依據。</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_14px_40px_rgba(45,212,191,.2)] transition hover:-translate-y-0.5 hover:bg-teal-200">{primaryLabel}<span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></Link>
              <Link href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/12 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/[.08]">看看怎麼運作</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2"><CheckIcon />無需連接券商帳戶</span>
              <span className="flex items-center gap-2"><CheckIcon />每位使用者獨立資料</span>
              <span className="flex items-center gap-2"><CheckIcon />僅供試算與紀錄</span>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-white/[.025] px-5 py-7 sm:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 text-center sm:grid-cols-3 sm:divide-x sm:divide-white/10">
          <Stat value="2×" label="00631L 名目曝險估算" /><Stat value="一眼" label="現金、持股、損益同畫面" /><Stat value="手動" label="取得盤中價後更新" />
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="WHY IT MATTERS" title="槓桿部位，不能只用一般庫存思維管理" description="一般看盤工具告訴你賺多少；這裡更在意，你的持股與現金組合起來，正在承擔多少市場曝險。" />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">{features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}</div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-white/[.07] bg-slate-900/45 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="SIMPLE WORKFLOW" title="三步驟，建立你的曝險紀律" description="不需要整理完整券商對帳單。從現在的部位開始，之後只要記錄每一次買賣。" />
          <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
            <div className="absolute left-[16.67%] right-[16.67%] top-7 hidden h-px bg-gradient-to-r from-teal-300/10 via-teal-300/70 to-teal-300/10 lg:block" />
            {steps.map(([number, title, description]) => <article key={number} className="relative rounded-2xl border border-white/[.08] bg-slate-950/75 p-6"><div className="relative z-10 grid size-14 place-items-center rounded-2xl border border-teal-300/25 bg-teal-300/10 font-mono text-sm font-black text-teal-200">{number}</div><h3 className="mt-6 text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,.95),rgba(8,47,73,.55))] p-7 sm:p-10 lg:grid-cols-[1fr_.9fr] lg:p-14">
          <div><p className="text-xs font-black tracking-[.2em] text-orange-300">DESIGNED FOR DISCIPLINE</p><h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">在情緒加碼之前，先看一眼曝險。</h2><p className="mt-5 max-w-xl leading-8 text-slate-300">00631L 的價格只是畫面上的一個數字。真正影響決策的，是持股占你總資產多少、手上還剩多少現金，以及加碼後曝險會走到哪裡。</p><div className="mt-7 flex flex-wrap gap-2 text-sm">{["單一策略專注", "台灣費稅情境", "歷次交易留痕", "風險層級提示"].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-slate-300">{item}</span>)}</div></div>
          <div className="rounded-2xl border border-orange-300/15 bg-orange-300/[.06] p-6 sm:p-7"><p className="text-sm font-bold text-orange-200">重要說明</p><p className="mt-4 text-sm leading-7 text-slate-300">本工具將 00631L 持股市值乘以 2，作為名目曝險估算。槓桿 ETF 追蹤的是標的指數單日報酬倍數，實際跨日績效仍會受到每日再平衡、波動耗損、追蹤差異與折溢價影響。</p><p className="mt-4 text-xs leading-6 text-slate-500">風險層級為本工具的資訊呈現方式，不是法定風險評等，也不構成任何投資建議。</p></div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-teal-300/20 bg-teal-300/[.07] px-6 py-12 text-center sm:px-12 sm:py-16"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(45,212,191,.23),transparent_48%)]" /><div className="relative"><p className="text-xs font-black tracking-[.2em] text-teal-200">START WITH CLARITY</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">下一次交易前，先建立你的曝險基準。</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">從既有持股開始，幾分鐘內看見現金、部位與名目曝險的完整關係。</p><Link href={primaryHref} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-300 px-7 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-teal-200">{primaryLabel}</Link></div></div>
      </section>
    </main>
  );
}

function DashboardPreview() {
  const ticks = Array.from({ length: 25 }, (_, index) => index);
  return <div className="relative mx-auto w-full max-w-xl lg:mx-0"><div className="absolute -inset-8 -z-10 rounded-full bg-teal-400/10 blur-3xl" /><div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-900/85 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div><p className="text-[10px] font-black tracking-[.17em] text-teal-300">EXPOSURE DASHBOARD</p><p className="mt-1 text-sm font-bold text-white">00631L 部位總覽</p></div><span className="rounded-full bg-orange-300/10 px-3 py-1 text-[10px] font-bold text-orange-200 ring-1 ring-orange-300/20">高曝險</span></div><div className="grid gap-5 p-5 sm:grid-cols-[.9fr_1.1fr] sm:p-6"><div className="relative mx-auto aspect-square w-full max-w-[220px]"><div className="absolute inset-3 rounded-full border-[16px] border-slate-800" /><div className="absolute inset-3 rotate-45 rounded-full border-[16px] border-transparent border-r-orange-300 border-t-teal-300" />{ticks.map((tick) => <span key={tick} className="absolute left-1/2 top-1/2 h-[42%] w-px -translate-x-1/2 -translate-y-full origin-bottom" style={{ transform: `translate(-50%, -100%) rotate(${tick * 10.8 - 130}deg)` }}><i className="block h-1.5 w-px bg-slate-500" /></span>)}<div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-3xl font-black tracking-tight text-white">146.8%</p><p className="mt-1 text-[8px] font-bold tracking-[.16em] text-slate-500">NOMINAL EXPOSURE</p></div></div></div><div className="grid grid-cols-2 gap-2.5 self-center"><PreviewMetric label="名目曝險" value="NT$ 1,284K" tone="teal" /><PreviewMetric label="持股市值" value="NT$ 642K" tone="sky" /><PreviewMetric label="可用現金" value="NT$ 233K" tone="slate" /><PreviewMetric label="總損益" value="+NT$ 48K" tone="emerald" /></div></div><div className="flex items-center justify-between border-t border-white/[.07] bg-black/10 px-5 py-3 text-[10px] text-slate-500"><span>示意數據</span><span>最近儲存價格重新估值</span></div></div><div className="absolute -bottom-5 -left-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 shadow-xl sm:-left-8"><p className="text-[9px] font-bold tracking-wider text-slate-500">風險先於報酬</p><p className="mt-1 text-xs font-bold text-teal-200">每次加碼都有依據</p></div></div>;
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: "teal" | "sky" | "slate" | "emerald" }) {
  const styles = { teal: "border-teal-300/15 bg-teal-300/[.06] text-teal-200", sky: "border-sky-300/15 bg-sky-300/[.06] text-sky-200", slate: "border-white/[.08] bg-white/[.03] text-slate-200", emerald: "border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200" };
  return <div className={`rounded-xl border p-3 ${styles[tone]}`}><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-1 whitespace-nowrap text-xs font-black sm:text-sm">{value}</p></div>;
}

function FeatureCard({ eyebrow, title, description, accent, icon }: { eyebrow: string; title: string; description: string; accent: string; icon: string }) {
  const styles: Record<string, string> = { teal: "border-teal-300/15 bg-teal-300/[.055] text-teal-200", sky: "border-sky-300/15 bg-sky-300/[.055] text-sky-200", orange: "border-orange-300/15 bg-orange-300/[.055] text-orange-200" };
  return <article className="rounded-3xl border border-white/[.08] bg-slate-900/55 p-6 transition hover:-translate-y-1 hover:border-white/15"><div className={`grid size-12 place-items-center rounded-2xl border font-mono text-sm font-black ${styles[accent]}`}>{icon}</div><p className="mt-7 text-[10px] font-black tracking-[.2em] text-slate-500">{eyebrow}</p><h3 className="mt-2 text-xl font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="max-w-3xl"><p className="text-xs font-black tracking-[.2em] text-teal-300">{eyebrow}</p><h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h2><p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">{description}</p></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="px-4 py-2"><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function CheckIcon() { return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 text-teal-300"><circle cx="10" cy="10" r="9" fill="currentColor" fillOpacity=".12" /><path d="m6.5 10 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
