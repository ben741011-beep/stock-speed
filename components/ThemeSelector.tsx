"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";

const themeOptions: Array<{ label: string; theme: Theme }> = [
  { label: "明亮", theme: "light" },
  { label: "暗色", theme: "dark" },
];

export function ThemeSelector({ initialTheme }: { initialTheme: Theme }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function selectTheme(nextTheme: Theme) {
    if (nextTheme === theme || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });

      if (!response.ok) throw new Error("Theme update failed");

      setTheme(nextTheme);
      router.refresh();
    } catch {
      setError("目前無法切換風格，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex rounded-xl border border-white/10 bg-slate-900/60 p-1" aria-label="頁面風格">
        {themeOptions.map((option) => {
          const selected = option.theme === theme;

          return (
            <button
              key={option.theme}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              onClick={() => selectTheme(option.theme)}
              className={`rounded-lg px-2 py-1.5 text-xs font-bold transition sm:px-2.5 ${selected
                ? "bg-teal-400 text-slate-950"
                : "text-slate-400 hover:bg-white/10 hover:text-white"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite">{error}</span>
    </div>
  );
}
