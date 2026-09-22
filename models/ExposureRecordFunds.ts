export type ExposureFundsUpdateInput = {
  cash: number;
};

export class ExposureFundsUpdateError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function parseNonNegativeNumber(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ExposureFundsUpdateError(`${label}必須是大於或等於 0 的數字。`);
  }
  return parsed;
}

export function parseExposureFundsUpdate(value: unknown): ExposureFundsUpdateInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExposureFundsUpdateError("資金設定格式不正確。");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || !("cash" in input)) {
    throw new ExposureFundsUpdateError("資金設定只能包含目前可用現金。");
  }
  return { cash: parseNonNegativeNumber(input.cash, "目前可用現金") };
}

export function calculateAdjustedImportStartingCash(
  startingCash: number,
  currentCash: number,
  nextCash: number,
) {
  const adjusted = startingCash + (nextCash - currentCash);
  if (!Number.isFinite(adjusted) || adjusted < 0) {
    throw new ExposureFundsUpdateError("目前現金無法由非負的起始現金表示，請確認輸入金額。");
  }
  return adjusted;
}
