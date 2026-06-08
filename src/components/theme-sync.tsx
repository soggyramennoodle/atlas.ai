"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  parseThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme";

async function saveThemePreference(theme: ThemePreference) {
  await fetch("/api/profile/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
}

/**
 * Keeps next-themes in sync with the signed-in user's saved preference so
 * light / dark / system follows them across browsers and devices.
 */
export function ThemeSync({
  savedTheme,
}: {
  savedTheme: ThemePreference | null;
}) {
  const { theme, setTheme } = useTheme();
  const hydrated = useRef(false);
  const skipNextSave = useRef(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (savedTheme) {
      skipNextSave.current = true;
      setTheme(savedTheme);
    }
  }, [savedTheme, setTheme]);

  useEffect(() => {
    if (savedTheme || seeded.current) return;
    const local = parseThemePreference(theme);
    if (!local) return;
    seeded.current = true;
    void saveThemePreference(local);
  }, [savedTheme, theme]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const choice = parseThemePreference(theme);
    if (!choice || !THEME_PREFERENCES.includes(choice)) return;
    void saveThemePreference(choice);
  }, [theme]);

  return null;
}
