"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
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
  }, [target]);
  return value.toFixed(decimals);
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const Icon = ICONS[stat.icon];
  const display = useCountUp(stat.value, stat.decimals ?? 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glow-card group relative overflow-hidden rounded-2xl border bg-card/55 p-5 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 font-mono text-3xl font-semibold tabular-nums tracking-tight">
        {display}
        {stat.suffix && (
          <span className="ml-1 text-base text-muted-foreground">
            {stat.suffix}
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
    </motion.div>
  );
}

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <StatCard key={s.label} stat={s} index={i} />
      ))}
    </div>
  );
}
