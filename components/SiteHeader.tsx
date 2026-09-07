"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const isSetupRoute = ["/setup", "/input", "/import"].includes(pathname);
  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-400 text-sm font-black text-slate-950">2×</span>
          <span className="hidden lg:block"><span className="block text-xs font-bold tracking-[0.2em] text-teal-300">EXPOSURE METER</span><span className="text-sm font-semibold text-white">00631L 暴險時速表</span></span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm font-semibold sm:gap-2">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`rounded-lg px-3 py-2 transition ${pathname === "/" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>儀表板</Link>
          <Link href="/setup" aria-current={isSetupRoute ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${isSetupRoute ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>起始設定</Link>
          <Link href="/trade" aria-current={pathname === "/trade" ? "page" : undefined} className={`rounded-lg px-3 py-2 transition ${pathname === "/trade" ? "bg-teal-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>買賣</Link>
        </nav>
      </div>
    </header>
  );
}
