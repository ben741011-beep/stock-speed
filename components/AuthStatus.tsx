import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { readSession } from "@/lib/session";

export async function AuthStatus() {
  const session = await readSession();

  if (!session) {
    return (
      <div className="flex items-center gap-1 text-sm font-semibold">
        <Link className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white" href="/login">
          登入
        </Link>
        <Link className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950 hover:bg-teal-300" href="/register">
          註冊
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link className="hidden rounded-lg px-3 py-2 font-semibold text-slate-300 hover:bg-white/10 hover:text-white lg:block" href="/dashboard">
        我的儀表板
      </Link>
      <LogoutButton />
    </div>
  );
}
