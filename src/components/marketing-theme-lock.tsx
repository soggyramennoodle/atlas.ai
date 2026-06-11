"use client";

import { useEffect } from "react";

/**
 * Locks marketing surfaces to dark mode. The cinematic landing renders on a
 * black canvas, so the html-level tokens must stay dark for everything that
 * lives outside the layout wrapper: the body background (overscroll), and
 * portaled UI like dropdown menus and toasts.
 */
export function MarketingThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");

    const observer = new MutationObserver(() => {
      if (!root.classList.contains("dark")) {
        root.classList.add("dark");
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  return null;
}
