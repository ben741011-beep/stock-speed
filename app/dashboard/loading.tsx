export default function DashboardLoading() {
  return (
    <main className="px-5 py-12 sm:px-8 lg:py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-8">
          <p className="text-sm font-bold tracking-[.18em] text-teal-300">LIVE DASHBOARD</p>
          <h1 className="mt-2 text-3xl font-bold text-white">正在載入儀表板…</h1>
          <p className="mt-2 text-sm text-slate-400">正在讀取持股、現金與最近儲存的價格。</p>
          <div className="mt-8 h-48 animate-pulse rounded-2xl bg-slate-800/70" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-800/70" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
