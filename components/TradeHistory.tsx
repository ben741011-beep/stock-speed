"use client";

import { useEffect, useState } from "react";

type TradeHistoryRecord = {
  _id: string;
  createdAt: string;
  side: "buy" | "sell";
  price: number;
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const priceFormatter = new Intl.NumberFormat("zh-TW", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 10,
});

export function TradeHistory({ refreshKey }: { refreshKey: number }) {
  const [records, setRecords] = useState<TradeHistoryRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecords() {
      try {
        const response = await fetch("/api/exposure/transactions?limit=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "無法讀取交易紀錄。");
        if (!Array.isArray(data.records)) throw new Error("交易紀錄格式不正確。");
        setRecords(data.records);
        setError("");
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "無法讀取交易紀錄。");
      }
    }

    void loadRecords();
    return () => controller.abort();
  }, [refreshKey]);

  return (
    <section className="mt-8 border-t border-white/10 pt-7" aria-labelledby="trade-history-heading">
      <h2 id="trade-history-heading" className="text-lg font-bold text-white">交易紀錄</h2>
      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p>
      ) : records === null ? (
        <p className="mt-4 text-sm text-slate-400">讀取交易紀錄中…</p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">尚無交易紀錄。</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/70 text-slate-300">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">日期</th>
                <th scope="col" className="px-4 py-3 font-semibold">交易方向</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">每股交易價格</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {records.map((record) => (
                <tr key={record._id}>
                  <td className="px-4 py-3 text-slate-200">{dateFormatter.format(new Date(record.createdAt))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${record.side === "buy" ? "bg-teal-400/10 text-teal-300" : "bg-orange-400/10 text-orange-300"}`}>
                      {record.side === "buy" ? "買入" : "賣出"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">NT$ {priceFormatter.format(record.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
