import Link from "next/link";

const options = [
  {
    href: "/input",
    eyebrow: "CASH ONLY",
    title: "尚未開始買股",
    description: "先設定可用現金，之後再透過買賣功能建立持股與成本。",
    action: "設定起始現金",
    tone: "teal",
  },
  {
    href: "/import",
    eyebrow: "EXISTING POSITION",
    title: "已經持有股票",
    description: "匯入目前股數、持股成本與帳面價值，接續統計既有部位。",
    action: "匯入既有持股",
    tone: "violet",
  },
] as const;

export default function SetupPage() {
  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden bg-slate-950 px-5 py-10 text-slate-100 sm:px-8 lg:py-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_17%_15%,rgba(20,184,166,.16),transparent_29%),radial-gradient(circle_at_84%_70%,rgba(139,92,246,.14),transparent_31%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 lg:p-10">
          <p className="text-sm font-bold tracking-[.18em] text-teal-300">GET STARTED</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">選擇你的起始方式</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            依照目前是否持有 00631L 選擇一種設定方式。這只會決定要填寫的起始資料，不會修改先前的紀錄。
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {options.map((option) => {
              const isTeal = option.tone === "teal";

              return (
                <Link
                  key={option.href}
                  href={option.href}
                  className={`group flex min-h-64 flex-col rounded-3xl border p-6 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 ${
                    isTeal
                      ? "border-teal-400/20 bg-teal-400/10 hover:border-teal-300/50 focus-visible:ring-teal-400/30"
                      : "border-violet-400/20 bg-violet-400/10 hover:border-violet-300/50 focus-visible:ring-violet-400/30"
                  }`}
                >
                  <p className={`text-xs font-bold tracking-[.18em] ${isTeal ? "text-teal-300" : "text-violet-300"}`}>
                    {option.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">{option.title}</h2>
                  <p className="mt-3 leading-7 text-slate-300">{option.description}</p>
                  <span className={`mt-auto pt-8 font-bold ${isTeal ? "text-teal-300" : "text-violet-300"}`}>
                    {option.action} <span aria-hidden="true" className="inline-block transition group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
