"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const THEMES = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof THEMES)[number];

const META: Record<
  ThemeChoice,
  { label: string; icon: typeof Sun; description: string }
> = {
  system: {
    label: "System",
    icon: Monitor,
    description: "Match your device",
  },
  light: {
    label: "Light",
    icon: Sun,
    description: "Bright canvas",
  },
  dark: {
    label: "Dark",
    icon: Moon,
    description: "Low-light mode",
  },
};

export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const choice: ThemeChoice =
    mounted && THEMES.includes(theme as ThemeChoice)
      ? (theme as ThemeChoice)
      : "system";
  const meta = META[choice];
  const Icon = meta.icon;

  function cycleTheme() {
    const idx = THEMES.indexOf(choice);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <motion.button
      type="button"
      data-tour="theme-selector"
      aria-label={`Theme: ${meta.label}. Click to change.`}
      onClick={cycleTheme}
      className={cn(
        "hover-glow icon-animate flex w-full items-center gap-3 rounded-[4px] border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-border bg-card text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-none">{meta.label}</span>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {meta.description}
        </span>
      </span>
    </motion.button>
  );
}
