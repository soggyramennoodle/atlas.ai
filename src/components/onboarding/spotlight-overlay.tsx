"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAD = 10;
const RADIUS = 6;

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function measureTarget(selector: string): Rect | null {
  const els = document.querySelectorAll(selector);
  for (const el of els) {
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    return {
      top: box.top - PAD,
      left: box.left - PAD,
      width: box.width + PAD * 2,
      height: box.height + PAD * 2,
    };
  }
  return null;
}

export function SpotlightOverlay({
  target,
  title,
  body,
  stepIndex,
  totalSteps,
  placement = "right",
  onNext,
  onSkip,
  isLast,
}: {
  target: string;
  title: string;
  body: string;
  stepIndex: number;
  totalSteps: number;
  placement?: "right" | "bottom" | "top" | "left";
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);

  const update = useCallback(() => {
    setRect(measureTarget(target));
  }, [target]);

  useEffect(() => {
    update();
    const t = window.setTimeout(update, 80);
    const t2 = window.setTimeout(update, 320);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = window.setInterval(update, 400);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [update, target]);

  const popoverStyle = (() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const gap = 16;
    const maxW = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (placement === "right") {
      let left = rect.left + rect.width + gap;
      let top = rect.top;
      if (left + maxW > vw - 16) {
        left = Math.max(16, rect.left - maxW - gap);
      }
      top = Math.min(Math.max(16, top), vh - 200);
      return { top, left, maxWidth: maxW };
    }

    if (placement === "bottom") {
      let top = rect.top + rect.height + gap;
      let left = Math.min(
        Math.max(16, rect.left),
        vw - maxW - 16
      );
      if (top + 180 > vh - 16) {
        top = Math.max(16, rect.top - 180 - gap);
      }
      return { top, left, maxWidth: maxW };
    }

    if (placement === "top") {
      const top = Math.max(16, rect.top - 180 - gap);
      const left = Math.min(Math.max(16, rect.left), vw - maxW - 16);
      return { top, left, maxWidth: maxW };
    }

    const left = Math.max(16, rect.left - maxW - gap);
    const top = Math.min(Math.max(16, rect.top), vh - 200);
    return { top, left, maxWidth: maxW };
  })();

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={title}>
      <AnimatePresence>
        {rect && (
          <motion.div
            key={target}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0"
          >
            <motion.div
              layout
              className="pointer-events-auto absolute rounded-[4px] border-2 border-primary ring-4 ring-primary/25"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: RADIUS,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.58)",
              }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key={`${target}-popover`}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto fixed z-[210] rounded-[4px] border border-border bg-card p-5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]",
          !rect && "left-1/2 top-1/2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
        )}
        style={rect ? popoverStyle : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tour"
            className="grid size-7 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <h2 className="mt-2 text-lg font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground transition hover:text-foreground"
          >
            Skip tour
          </button>
          <Button size="sm" onClick={onNext} className="gap-1.5">
            {isLast ? "Get started" : "Next"}
            {!isLast && <ArrowRight className="size-3.5" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
