type HoldingRecord = {
  holdingShares?: number | null;
  lastTrade?: {
    side?: string | null;
    shares?: number | null;
  } | null;
};

export function getHoldingShares(record: HoldingRecord) {
  if (typeof record.holdingShares === "number" && record.holdingShares > 0) {
    return record.holdingShares;
  }
  return record.lastTrade?.side === "buy" ? record.lastTrade.shares ?? 0 : 0;
}
