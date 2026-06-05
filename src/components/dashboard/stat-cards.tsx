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

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const reduce = useReducedMotion();
  const Icon = ICONS[stat.icon];
  const display = useCountUp(stat.value, stat.decimals ?? 0);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group icon-animate rounded-[4px] border border-border bg-card p-5 transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-foreground/25 hover:bg-secondary/45 hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_14px_30px_-20px_rgba(0,0,0,0.34)] motion-reduce:hover:translate-y-0"
    >
      <span className="grid size-10 place-items-center rounded-[4px] border border-border bg-background text-foreground transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight">
        {display}
        {stat.suffix && (
          <span className="ml-1 text-base font-medium text-muted-foreground">
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
