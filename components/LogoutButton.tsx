"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={logout}
      className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      {loading ? "登出中…" : "登出"}
    </button>
  );
}
