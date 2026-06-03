"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const SWITCH_MS = 700;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isDark = mounted ? theme !== "light" : true;

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    const root = document.documentElement;
    setSwitching(true);
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), SWITCH_MS);
    window.setTimeout(() => setSwitching(false), SWITCH_MS + 80);
    setTheme(next);
  }

  return (
    <>
      <AnimatePresence>
        {switching && (
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[65] bg-background"
            initial={{ opacity: 0.28 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={!isDark}
        onClick={toggleTheme}
        className={cn(
          "fixed right-16 top-3 z-[70] grid size-10 place-items-center overflow-hidden rounded-full border bg-background/80 text-foreground shadow-lg backdrop-blur-xl transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:right-4 md:top-20 xl:top-4",
          "before:pointer-events-none before:absolute before:inset-0 before:bg-aurora before:opacity-70"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          className="absolute inset-1 rounded-full bg-card/70"
          layout
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            className="relative text-primary"
            initial={{ opacity: 0, rotate: -45, scale: 0.65 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.65 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
