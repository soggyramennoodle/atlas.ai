"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getMarketingPreviewTheme,
  MARKETING_THEME_EVENT,
  setMarketingPreviewTheme,
  type MarketingPreviewTheme,
} from "@/lib/marketing-theme";

/**
 * Inconspicuous light/dark switch for marketing screenshots. Uses session
 * storage so it does not overwrite the signed-in app theme preference.
 */
export function MarketingThemeToggle() {
  const [theme, setTheme] = useState<MarketingPreviewTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(getMarketingPreviewTheme());
      setMounted(true);
    });

    function onChange() {
      setTheme(getMarketingPreviewTheme());
    }

    window.addEventListener(MARKETING_THEME_EVENT, onChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(MARKETING_THEME_EVENT, onChange);
    };
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setMarketingPreviewTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 transition hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}
