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
  const appliedSavedTheme = useRef<ThemePreference | null>(null);

  // Apply the server-stored preference once per saved value. `setTheme` from
  // next-themes is recreated whenever `theme` changes — including it in deps
  // would re-run this effect after every local toggle and snap the UI back.
  useEffect(() => {
    if (!savedTheme || appliedSavedTheme.current === savedTheme) return;
    appliedSavedTheme.current = savedTheme;
    skipNextSave.current = true;
    setTheme(savedTheme);
    // setTheme identity changes when theme changes; only react to savedTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [savedTheme]);

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
