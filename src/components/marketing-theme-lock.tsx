"use client";

import { useEffect } from "react";
import {
  applyMarketingPreviewTheme,
  getMarketingPreviewTheme,
  MARKETING_THEME_EVENT,
} from "@/lib/marketing-theme";

/**
 * Keeps marketing surfaces in light mode by default, but honors the session-only
 * preview toggle so promo screenshots can use dark mode without changing the app
 * theme stored in localStorage.
 */
export function MarketingThemeLock() {
  useEffect(() => {
    const root = document.documentElement;

    function sync() {
      applyMarketingPreviewTheme(getMarketingPreviewTheme());
    }

    sync();

    window.addEventListener(MARKETING_THEME_EVENT, sync);

    const observer = new MutationObserver(() => {
      const desired = getMarketingPreviewTheme();
      const hasDark = root.classList.contains("dark");
      if (desired === "dark" && !hasDark) {
        root.classList.add("dark");
      } else if (desired === "light" && hasDark) {
        root.classList.remove("dark");
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener(MARKETING_THEME_EVENT, sync);
      observer.disconnect();
    };
  }, []);

  return null;
}
