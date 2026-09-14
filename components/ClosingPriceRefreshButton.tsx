"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RefreshResponse = {
  error?: string;
  message?: string;
  quote?: { close: number; quoteDate: string };
};

export function ClosingPriceRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);

  async function refreshClosingPrice() {
    setLoading(true);
    setStatus("");
    setFailed(false);

    try {
      const response = await fetch("/api/market/quote", { method: "POST" });
      const data = (await response.json()) as RefreshResponse;
      if (!response.ok) throw new Error(data.error || "更新收盤價失敗。");

      setStatus(data.message || "收盤價已更新。");
      router.refresh();
    } catch (error) {
      setFailed(true);
      setStatus(error instanceof Error ? error.message : "更新收盤價失敗。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-teal-400/15 bg-teal-400/5 p-4 sm:w-auto sm:max-w-xs">
      <button
        type="button"
        disabled={loading}
        onClick={refreshClosingPrice}
        className="w-full rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "更新收盤價中…" : "手動更新收盤價"}
      </button>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        建議台股交易日 15:30 後更新
      </p>
      {status ? (
        <p className={`mt-2 text-xs font-semibold ${failed ? "text-rose-300" : "text-teal-300"}`} role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
