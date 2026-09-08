"use client";

import { useState } from "react";

type Operator = "+" | "−" | "×" | "÷";

const numberKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "."];

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  return right === 0 ? null : left / right;
}

function normalizeDisplay(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

export function CashCalculator({
  initialValue,
  onApply,
}: {
  initialValue: string;
  onApply: (value: string) => void;
}) {
  const initialNumber = Number(initialValue);
  const [display, setDisplay] = useState(
    initialValue !== "" && Number.isFinite(initialNumber) ? normalizeDisplay(initialNumber) : "0",
  );
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [replaceDisplay, setReplaceDisplay] = useState(true);
  const [error, setError] = useState("");

  function inputNumber(key: string) {
    setError("");
    setDisplay((current) => {
      if (key === ".") {
        if (!replaceDisplay && current.includes(".")) return current;
        return replaceDisplay ? "0." : `${current}.`;
      }

      if (replaceDisplay || current === "0") return key;
      return current.length >= 15 ? current : `${current}${key}`;
    });
    setReplaceDisplay(false);
  }

  function chooseOperator(nextOperator: Operator) {
    const currentValue = Number(display);
    if (!Number.isFinite(currentValue)) return;

    if (storedValue !== null && operator && !replaceDisplay) {
      const result = calculate(storedValue, currentValue, operator);
      if (result === null) {
        setError("不能除以 0。");
        return;
      }
      setStoredValue(result);
      setDisplay(normalizeDisplay(result));
    } else {
      setStoredValue(currentValue);
    }

    setOperator(nextOperator);
    setReplaceDisplay(true);
  }

  function showResult() {
    if (storedValue === null || !operator) return;
    const result = calculate(storedValue, Number(display), operator);
    if (result === null) {
      setError("不能除以 0。");
      return;
    }

    setDisplay(normalizeDisplay(result));
    setStoredValue(null);
    setOperator(null);
    setReplaceDisplay(true);
  }

  function clear() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setReplaceDisplay(true);
    setError("");
  }

  function backspace() {
    if (replaceDisplay) return;
    setDisplay((current) => current.length <= 1 ? "0" : current.slice(0, -1));
  }

  function applyCash() {
    const value = Number(display);
    if (!Number.isFinite(value) || value < 0) {
      setError("目前可用現金不能小於 0。");
      return;
    }
    onApply(normalizeDisplay(value));
  }

  return (
    <div className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] p-4" aria-label="現金計算機">
      <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-right">
        <p className="min-h-4 text-xs text-slate-500">{storedValue !== null && operator ? `${normalizeDisplay(storedValue)} ${operator}` : "現金計算機"}</p>
        <output className="mt-1 block overflow-hidden text-2xl font-bold tabular-nums text-white" aria-live="polite">{display}</output>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button type="button" onClick={clear} className="rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700">AC</button>
        <button type="button" onClick={backspace} aria-label="刪除最後一位" className="rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700">⌫</button>
        <button type="button" onClick={() => chooseOperator("÷")} className="rounded-xl bg-violet-400/15 px-3 py-3 font-bold text-violet-200 hover:bg-violet-400/25">÷</button>
        <button type="button" onClick={() => chooseOperator("×")} className="rounded-xl bg-violet-400/15 px-3 py-3 font-bold text-violet-200 hover:bg-violet-400/25">×</button>

        {numberKeys.slice(0, 3).map((key) => <CalculatorNumber key={key} value={key} onClick={inputNumber} />)}
        <button type="button" onClick={() => chooseOperator("−")} className="rounded-xl bg-violet-400/15 px-3 py-3 font-bold text-violet-200 hover:bg-violet-400/25">−</button>
        {numberKeys.slice(3, 6).map((key) => <CalculatorNumber key={key} value={key} onClick={inputNumber} />)}
        <button type="button" onClick={() => chooseOperator("+")} className="rounded-xl bg-violet-400/15 px-3 py-3 font-bold text-violet-200 hover:bg-violet-400/25">+</button>
        {numberKeys.slice(6, 9).map((key) => <CalculatorNumber key={key} value={key} onClick={inputNumber} />)}
        <button type="button" onClick={showResult} className="row-span-2 rounded-xl bg-violet-400 px-3 py-3 font-black text-slate-950 hover:bg-violet-300">＝</button>
        <button type="button" onClick={() => inputNumber("0")} className="col-span-2 rounded-xl bg-slate-800 px-3 py-3 font-bold text-slate-100 hover:bg-slate-700">0</button>
        <CalculatorNumber value="." onClick={inputNumber} />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p> : null}
      <button type="button" onClick={applyCash} className="mt-3 w-full rounded-xl border border-violet-300/30 bg-violet-400/10 px-4 py-3 text-sm font-bold text-violet-100 hover:bg-violet-400/20">
        套用到目前可用現金
      </button>
    </div>
  );
}

function CalculatorNumber({ value, onClick }: { value: string; onClick: (value: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(value)} className="rounded-xl bg-slate-800 px-3 py-3 font-bold text-slate-100 hover:bg-slate-700">
      {value}
    </button>
  );
}
