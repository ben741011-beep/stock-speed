export const THEME_COOKIE_NAME = "stock_speed_theme";

export const themes = ["light", "dark"] as const;

export type Theme = (typeof themes)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && themes.includes(value as Theme);
}

export function getTheme(value: unknown): Theme {
  return isTheme(value) ? value : "dark";
}
