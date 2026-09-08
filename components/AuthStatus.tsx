import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
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
      <span className="hidden max-w-48 truncate text-slate-400 xl:block">{user.email}</span>
      <LogoutButton />
    </div>
  );
}
