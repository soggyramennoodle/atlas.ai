"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Mic, Clock, Sparkles, Flame, type LucideIcon } from "lucide-react";

export interface Stat {
  icon: "mic" | "clock" | "sparkles" | "flame";
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}

const ICONS: Record<Stat["icon"], LucideIcon> = {
  mic: Mic,
  clock: Clock,
  sparkles: Sparkles,
  flame: Flame,
};

function useCountUp(target: number, decimals = 0) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const started = useRef(false);
  useEffect(() => {
    if (reduce || started.current) return;
    started.current = true;
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return value.toFixed(decimals);
}

/** One stat as a hairline pill — the editorial counterpart of the old boxy card. */
function StatPill({ stat, index }: { stat: Stat; index: number }) {
  const reduce = useReducedMotion();
  const Icon = ICONS[stat.icon];
  const display = useCountUp(stat.value, stat.decimals ?? 0);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5 rounded-full border border-black/[0.12] bg-white px-4 py-2.5 transition-colors hover:border-black/25"
    >
      <Icon className="size-4 shrink-0 text-[#0d0d0d]/50" />
      <span className="text-base font-medium tabular-nums tracking-tight">
        {display}
        {stat.suffix && (
          <span className="ml-0.5 text-sm font-normal text-[#0d0d0d]/55">
            {stat.suffix}
          </span>
        )}
      </span>
      <span className="text-sm text-[#0d0d0d]/55">{stat.label}</span>
    </motion.div>
  );
}

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {stats.map((s, i) => (
        <StatPill key={s.label} stat={s} index={i} />
      ))}
    </div>
  );
}
