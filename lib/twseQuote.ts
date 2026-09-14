type TwseStockDayResponse = {
  stat?: string;
  title?: string;
  data?: string[][];
};

function getTaipeiDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return {
    year: Number(year),
    month: Number(month),
    queryDate: `${year}${month}${day}`,
    isoDate: `${year}-${month}-${day}`,
  };
}

function getPreviousMonthQueryDate(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}01`;
}

function rocDateToIso(value?: string) {
  const match = value?.match(/^(\d{3})\/(\d{2})\/(\d{2})$/);
  return match ? `${Number(match[1]) + 1911}-${match[2]}-${match[3]}` : null;
}

function parsePrice(value?: string) {
  const price = Number(value?.replaceAll(",", ""));
  return Number.isFinite(price) && price > 0 ? price : null;
}

export async function fetchLatestTwseClosingPrice(symbol = "00631L") {
  if (!/^[0-9A-Z]{4,10}$/.test(symbol)) throw new Error("股票代碼格式不正確。");
  const { year, month, queryDate, isoDate } = getTaipeiDate();

  async function fetchMonth(date: string) {
    const endpoint = new URL("https://www.twse.com.tw/exchangeReport/STOCK_DAY");
    endpoint.searchParams.set("response", "json");
    endpoint.searchParams.set("date", date);
    endpoint.searchParams.set("stockNo", symbol);

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`證交所每日行情價服務回傳 ${response.status}。`);
    const data = await response.json() as TwseStockDayResponse;
    if (data.stat !== "OK") throw new Error(data.stat || "查無股票每日成交資訊。");
    return data;
  }

  const currentMonth = await fetchMonth(queryDate);
  let rows = currentMonth.data ?? [];
  let title = currentMonth.title;
  let latest = rows
    .map((row) => ({ row, date: rocDateToIso(row[0]), price: parsePrice(row[6]) }))
    .filter((item) => item.date && item.date <= isoDate && item.price)
    .sort((left, right) => right.date!.localeCompare(left.date!))[0];

  if (!latest) {
    const previousMonth = await fetchMonth(getPreviousMonthQueryDate(year, month));
    rows = previousMonth.data ?? [];
    title = title ?? previousMonth.title;
    latest = rows
      .map((row) => ({ row, date: rocDateToIso(row[0]), price: parsePrice(row[6]) }))
      .filter((item) => item.date && item.price)
      .sort((left, right) => right.date!.localeCompare(left.date!))[0];
  }

  if (!latest?.date || !latest.price) {
    throw new Error("證交所尚未公布可用的正式收盤價。");
  }
  const name = title?.match(new RegExp(`${symbol}\\s+(.+?)\\s+各日成交資訊`))?.[1] ?? symbol;

  return {
    symbol,
    name,
    price: latest.price,
    quoteDate: latest.date,
  } as const;
}
