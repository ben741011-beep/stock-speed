"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteHeader({
  authStatus,
  themeSelector,
}: {
  authStatus: ReactNode;
  themeSelector: ReactNode;
}) {
  const pathname = usePathname();
  const isSetupRoute = ["/setup", "/input", "/import"].includes(pathname);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isLandingPage = pathname === "/";
  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:flex-nowrap sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-400 text-sm font-black text-slate-950">2×</span>
          <span className="hidden lg:block"><span className="block text-xs font-bold tracking-[0.2em] text-teal-300">EXPOSURE CONTROL</span><span className="text-sm font-semibold text-white">00631L 曝險控制台</span></span>
        </Link>
        {isLandingPage ? (
          <nav className="order-3 flex w-full items-center justify-center gap-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-1 sm:justify-end">
            <Link href="#features" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">核心功能</Link>
            <Link href="#how-it-works" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">使用方式</Link>
          </nav>
        ) : !isAuthRoute && (
          <nav className="order-3 flex w-full min-w-0 items-center gap-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-1 sm:justify-end sm:gap-2 sm:overflow-x-auto">
            <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined} className={`flex-1 rounded-lg px-3 py-2 text-center transition sm:flex-none ${pathname === "/dashboard" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>儀表板</Link>
            <Link href="/setup" aria-current={isSetupRoute ? "page" : undefined} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center transition sm:flex-none ${isSetupRoute ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>起始設定</Link>
            <Link href="/trade" aria-current={pathname === "/trade" ? "page" : undefined} className={`flex-1 rounded-lg px-3 py-2 text-center transition sm:flex-none ${pathname === "/trade" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>買賣</Link>
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
