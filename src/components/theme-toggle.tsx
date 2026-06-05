"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isDark = mounted ? theme !== "light" : true;

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
  }

  return (
    <motion.button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      onClick={toggleTheme}
      className={cn(
        // Sits clear of the floating site header: just below it on small and
        // medium widths, tucked into the top-right corner on xl where the
        // centered bar no longer reaches the edge.
        "fixed right-4 top-[5.5rem] z-[70] grid size-9 place-items-center overflow-hidden rounded-[4px] border bg-background/90 text-foreground shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:top-24 md:size-10 xl:top-4"
      )}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="absolute inset-1 rounded-[3px] bg-card/80" />
      <span className="relative text-primary">
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </span>
    </motion.button>
  );
}
