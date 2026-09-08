type MonthlyIndexStat = {
  month: string;
  rising: number;
  falling: number;
  samples: number;
  risingRate: number;
  averageRise: number;
  averageFall: number;
  expectedValue: number;
};

const monthlyIndexStats: MonthlyIndexStat[] = [
  { month: "1月", rising: 16, falling: 13, samples: 29, risingRate: 55.2, averageRise: 6.86, averageFall: -3.87, expectedValue: 2.05 },
  { month: "2月", rising: 19, falling: 10, samples: 29, risingRate: 65.5, averageRise: 5.26, averageFall: -3.74, expectedValue: 2.16 },
  { month: "3月", rising: 19, falling: 10, samples: 29, risingRate: 65.5, averageRise: 3.76, averageFall: -4.79, expectedValue: 0.81 },
  { month: "4月", rising: 14, falling: 15, samples: 29, risingRate: 48.3, averageRise: 6.49, averageFall: -4.28, expectedValue: 0.92 },
  { month: "5月", rising: 15, falling: 14, samples: 29, risingRate: 51.7, averageRise: 5.03, averageFall: -3.42, expectedValue: 0.95 },
  { month: "6月", rising: 14, falling: 15, samples: 29, risingRate: 48.3, averageRise: 5.33, averageFall: -4.73, expectedValue: 0.12 },
  { month: "7月", rising: 16, falling: 14, samples: 30, risingRate: 53.3, averageRise: 4.31, averageFall: -4.85, expectedValue: 0.03 },
  { month: "8月", rising: 16, falling: 14, samples: 30, risingRate: 53.3, averageRise: 2.92, averageFall: -4.45, expectedValue: -0.52 },
  { month: "9月", rising: 13, falling: 16, samples: 29, risingRate: 44.8, averageRise: 3.85, averageFall: -7.26, expectedValue: -2.28 },
  { month: "10月", rising: 19, falling: 10, samples: 29, risingRate: 65.5, averageRise: 3.77, averageFall: -7.88, expectedValue: -0.24 },
  { month: "11月", rising: 18, falling: 11, samples: 29, risingRate: 62.1, averageRise: 5.07, averageFall: -4.46, expectedValue: 1.46 },
  { month: "12月", rising: 23, falling: 6, samples: 29, risingRate: 79.3, averageRise: 4.78, averageFall: -5.35, expectedValue: 2.68 },
];

const percent = (value: number) => `${value.toFixed(2)}%`;

function ValueTone({ value }: { value: number }) {
  const tone = value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-slate-300";

  return <span className={`font-bold tabular-nums ${tone}`}>{percent(value)}</span>;
}

export function MonthlyIndexStats() {
  const currentMonth = Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Taipei",
    }).format(new Date()),
  );

  return (
    <section aria-labelledby="monthly-index-title" className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[0.18em] text-teal-300">SEASONAL SNAPSHOT</p>
        <h2 id="monthly-index-title" className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">加權指數各月份漲跌統計</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">將歷年同月份的上漲、下跌次數與平均幅度放在一起比較，快速掌握月份強弱。資料依你提供的表格整理。</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
          <p className="text-xs font-bold tracking-wider text-emerald-300/70">上漲機率最高</p>
          <p className="mt-2 text-2xl font-bold text-white">12月</p>
          <p className="mt-1 text-sm text-slate-400">79.30%・23 漲 / 6 跌</p>
        </div>
        <div className="rounded-2xl border border-teal-400/15 bg-teal-400/5 p-4">
          <p className="text-xs font-bold tracking-wider text-teal-300/70">期望值最高</p>
          <p className="mt-2 text-2xl font-bold text-white">12月</p>
          <p className="mt-1 text-sm text-slate-400">+2.68%</p>
        </div>
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/5 p-4">
          <p className="text-xs font-bold tracking-wider text-rose-300/70">期望值最低</p>
          <p className="mt-2 text-2xl font-bold text-white">9月</p>
          <p className="mt-1 text-sm text-slate-400">−2.28%</p>
        </div>
      </div>

      <div className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">加權指數 1 月至 12 月的上漲與下跌統計</caption>
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-bold tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-3 sm:px-4">月份</th>
                <th scope="col" className="px-2 py-3 text-right sm:px-3">期望值</th>
                <th scope="col" className="px-2 py-3 text-right sm:px-3">上漲率</th>
                <th scope="col" className="px-3 py-3 text-right">上漲時平均</th>
                <th scope="col" className="px-3 py-3 text-right">下跌時平均</th>
                <th scope="col" className="px-3 py-3 text-right">上漲</th>
                <th scope="col" className="px-3 py-3 text-right">下跌</th>
                <th scope="col" className="px-4 py-3 text-right">樣本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {monthlyIndexStats.map((item, index) => {
                const isCurrentMonth = index + 1 === currentMonth;

                return (
                  <tr
                    key={item.month}
                    className={isCurrentMonth
                      ? "bg-teal-400/[0.10] shadow-[inset_3px_0_0_#2dd4bf] transition-colors hover:bg-teal-400/[0.14]"
                      : "transition-colors hover:bg-white/[0.035]"}
                  >
                    <th
                      scope="row"
                      aria-current={isCurrentMonth ? "date" : undefined}
                      className="whitespace-nowrap px-3 py-3 font-bold text-white sm:px-4"
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.month}
                        {isCurrentMonth ? (
                          <span className="rounded-full bg-teal-400 px-2 py-0.5 text-[10px] font-black tracking-wider text-slate-950">
                            本月
                          </span>
                        ) : null}
                      </span>
                    </th>
                    <td className="px-2 py-3 text-right sm:px-3"><ValueTone value={item.expectedValue} /></td>
                    <td className="px-2 py-3 text-right sm:px-3">
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-slate-800 sm:block" aria-hidden="true">
                          <span className="block h-full rounded-full bg-teal-400" style={{ width: `${item.risingRate}%` }} />
                        </span>
                        <span className="tabular-nums text-slate-200 sm:w-14">{percent(item.risingRate)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{percent(item.averageRise)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-400">{percent(item.averageFall)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-300">{item.rising}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-rose-300">{item.falling}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{item.samples}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-500">
          期望值為依上漲率、上漲時平均與下跌時平均計算的統計結果；歷史統計不代表未來報酬。
        </div>
      </div>
    </section>
  );
}
