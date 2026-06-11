"use client";

import { useEffect } from "react";

/**
 * Locks marketing surfaces to light mode. The cinematic landing renders on a
 * light canvas, so the html-level tokens must stay light for everything that
 * lives outside the layout wrapper: the body background (overscroll), and
 * portaled UI like dropdown menus and toasts — even when the signed-in app
 * theme is dark.
 */
export function MarketingThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  return null;
}
