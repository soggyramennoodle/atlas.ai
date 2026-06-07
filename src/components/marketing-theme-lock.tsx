"use client";

import { useEffect } from "react";

/**
 * Keeps marketing surfaces in light mode regardless of the user's app theme
 * preference stored in localStorage.
 */
export function MarketingThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
