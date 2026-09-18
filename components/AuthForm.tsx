"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `${isLogin ? "登入" : "註冊"}失敗。`);
      }

      window.location.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "目前無法完成操作，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
      <p className="text-sm font-bold tracking-[.18em] text-teal-300">
        {isLogin ? "WELCOME BACK" : "CREATE ACCOUNT"}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        {isLogin ? "登入暴險時速表" : "建立你的帳號"}
      </h1>
      <p className="mt-3 leading-7 text-slate-400">
        {isLogin
          ? "輸入註冊時使用的 email 與密碼，繼續查看投資組合。"
          : "密碼會安全雜湊後儲存，註冊完成即自動登入。"}
      </p>

      <form className="mt-8 space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
          <input
            required
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">密碼</span>
          <input
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10"
            placeholder="至少 8 個字元"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-teal-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "處理中…" : isLogin ? "登入" : "註冊並登入"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {isLogin ? "還沒有帳號？" : "已經有帳號？"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-teal-300 hover:text-teal-200"
        >
          {isLogin ? "立即註冊" : "返回登入"}
        </Link>
      </p>
    </section>
  );
}
