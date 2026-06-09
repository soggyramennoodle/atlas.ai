export const MARKETING_PREVIEW_STORAGE_KEY = "atlas-marketing-preview";
export const MARKETING_THEME_EVENT = "atlas-marketing-theme-change";

export type MarketingPreviewTheme = "light" | "dark";

export function getMarketingPreviewTheme(): MarketingPreviewTheme {
  if (typeof window === "undefined") return "light";
  return sessionStorage.getItem(MARKETING_PREVIEW_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";
}

export function setMarketingPreviewTheme(theme: MarketingPreviewTheme) {
  sessionStorage.setItem(MARKETING_PREVIEW_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(MARKETING_THEME_EVENT));
}

export function applyMarketingPreviewTheme(theme: MarketingPreviewTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
