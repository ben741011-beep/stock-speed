"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export function SiteHeader({
  authStatus,
  exposureSetupComplete,
  themeSelector,
}: {
  authStatus: ReactNode;
  exposureSetupComplete: boolean | null;
  themeSelector: ReactNode;
}) {
  const pathname = usePathname();
  const isSetupRoute = ["/setup", "/input", "/import"].includes(pathname);
  const isExposureRoute = pathname === "/dashboard" || isSetupRoute || pathname === "/trade";
  const isSpotFuturesRoute = pathname === "/spot-futures" || pathname === "/spot-futures/manage";
  const [hoveredModel, setHoveredModel] = useState<"exposure" | "spot-futures" | null>(null);
  const highlightExposure = hoveredModel ? hoveredModel === "exposure" : isExposureRoute;
  const highlightSpotFutures = hoveredModel ? hoveredModel === "spot-futures" : isSpotFuturesRoute;
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isLandingPage = pathname === "/";
  return (
    <header className="cosmic-header border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:flex-nowrap sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="cosmic-logo grid size-9 place-items-center rounded-xl bg-teal-400 text-sm font-black text-slate-950">2×</span>
          <span className="hidden lg:block"><span className="block text-xs font-bold tracking-[0.2em] text-teal-300">EXPOSURE CONTROL</span><span className="text-sm font-semibold text-white">00631L 曝險控制台</span></span>
        </Link>
        {isLandingPage ? (
          <nav className="order-3 flex w-full items-center justify-center gap-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-1 sm:justify-end">
            <Link href="#features" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">核心功能</Link>
            <Link href="#how-it-works" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">使用方式</Link>
          </nav>
        ) : !isAuthRoute && (
          <nav aria-label="投資模型分頁" className="order-3 grid w-full grid-cols-2 gap-2 text-sm font-semibold sm:order-none sm:ml-auto sm:w-auto sm:grid-cols-none sm:grid-flow-col">
            <details
              name="investment-model-navigation"
              className="group relative"
              onMouseEnter={() => setHoveredModel("exposure")}
              onMouseLeave={() => setHoveredModel(null)}
            >
              <summary className={`flex cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-4 py-2 transition [&::-webkit-details-marker]:hidden ${highlightExposure ? "bg-orange-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                00631L <span aria-hidden="true" className="text-xs transition group-open:rotate-180">▼</span>
              </summary>
              <div className="absolute left-0 z-50 mt-2 min-w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/40">
                <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined} className={`block rounded-xl px-4 py-3 transition ${pathname === "/dashboard" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>時速表</Link>
                {exposureSetupComplete === false ? <Link href="/setup" aria-current={isSetupRoute ? "page" : undefined} className={`mt-1 block rounded-xl px-4 py-3 transition ${isSetupRoute ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>起始設定</Link> : null}
                <Link href="/trade" aria-current={pathname === "/trade" ? "page" : undefined} className={`mt-1 block rounded-xl px-4 py-3 transition ${pathname === "/trade" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>帳本管理</Link>
              </div>
            </details>
            <details
              name="investment-model-navigation"
              className="group relative"
              onMouseEnter={() => setHoveredModel("spot-futures")}
              onMouseLeave={() => setHoveredModel(null)}
            >
              <summary className={`flex cursor-pointer list-none items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 transition [&::-webkit-details-marker]:hidden ${highlightSpotFutures ? "bg-orange-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                0050＋微臺 <span aria-hidden="true" className="text-xs transition group-open:rotate-180">▼</span>
              </summary>
              <div className="absolute right-0 z-50 mt-2 min-w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/40">
                <Link href="/spot-futures" aria-current={pathname === "/spot-futures" ? "page" : undefined} className={`block rounded-xl px-4 py-3 transition ${pathname === "/spot-futures" ? "bg-orange-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>時速表</Link>
                <Link href="/spot-futures/manage" aria-current={pathname === "/spot-futures/manage" ? "page" : undefined} className={`mt-1 block rounded-xl px-4 py-3 transition ${pathname === "/spot-futures/manage" ? "bg-orange-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>帳本管理</Link>
              </div>
            </details>
          </nav>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {themeSelector}
          {authStatus}
        </div>
      </div>
    </header>
  );
}
