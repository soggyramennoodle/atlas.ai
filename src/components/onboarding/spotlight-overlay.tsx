"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAD = 10;
const RADIUS = 6;
const MOBILE_MAX = 1023;
const POPOVER_EST_HEIGHT = 220;

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return narrow;
}

function clampRect(rect: Rect, vw: number, vh: number): Rect {
  const margin = 8;
  const left = Math.max(margin, Math.min(rect.left, vw - rect.width - margin));
  const top = Math.max(margin, Math.min(rect.top, vh - rect.height - margin));
  const width = Math.min(rect.width, vw - margin * 2);
  const height = Math.min(rect.height, vh - margin * 2);
  return { top, left, width, height };
}

function measureTarget(selector: string): Rect | null {
  const els = document.querySelectorAll(selector);
  for (const el of els) {
    const htmlEl = el as HTMLElement;
    const box = htmlEl.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;

    htmlEl.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });

    const refreshed = htmlEl.getBoundingClientRect();
    const raw = {
      top: refreshed.top - PAD,
      left: refreshed.left - PAD,
      width: refreshed.width + PAD * 2,
      height: refreshed.height + PAD * 2,
    };
    return clampRect(raw, window.innerWidth, window.innerHeight);
  }
  return null;
}

function desktopPopoverStyle(
  rect: Rect,
  placement: "right" | "bottom" | "top" | "left"
) {
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
    if (left < 16) {
      top = rect.top + rect.height + gap;
      left = Math.max(16, Math.min(rect.left, vw - maxW - 16));
      return { top, left, maxWidth: maxW };
    }
    top = Math.min(Math.max(16, top), vh - POPOVER_EST_HEIGHT - 16);
    return { top, left, maxWidth: maxW };
  }

  if (placement === "bottom") {
    let top = rect.top + rect.height + gap;
    const left = Math.min(Math.max(16, rect.left), vw - maxW - 16);
    if (top + POPOVER_EST_HEIGHT > vh - 16) {
      top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - gap);
    }
    return { top, left, maxWidth: maxW };
  }

  if (placement === "top") {
    const top = Math.max(16, rect.top - POPOVER_EST_HEIGHT - gap);
    const left = Math.min(Math.max(16, rect.left), vw - maxW - 16);
    return { top, left, maxWidth: maxW };
  }

  const left = Math.max(16, rect.left - maxW - gap);
  const top = Math.min(Math.max(16, rect.top), vh - POPOVER_EST_HEIGHT - 16);
  return { top, left, maxWidth: maxW };
}

function mobilePopoverStyle(rect: Rect | null) {
  const inset = 16;
  const bottomInset =
    typeof window !== "undefined"
      ? Math.max(
          inset,
          Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "env(safe-area-inset-bottom)"
            )
          ) || inset
        )
      : inset;

  if (!rect) {
    return {
      left: inset,
      right: inset,
      bottom: bottomInset,
    };
  }

  const cardTop = window.innerHeight - POPOVER_EST_HEIGHT - bottomInset - 12;
  const spotlightBottom = rect.top + rect.height;
  const overlap = spotlightBottom > cardTop - 8;

  if (overlap && rect.top > POPOVER_EST_HEIGHT + bottomInset + 32) {
    return {
      left: inset,
      right: inset,
      top: Math.max(inset, rect.top - POPOVER_EST_HEIGHT - 12),
    };
  }

  return {
    left: inset,
    right: inset,
    bottom: bottomInset,
  };
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
  const narrow = useNarrowViewport();

  const update = useCallback(() => {
    setRect(measureTarget(target));
  }, [target]);

  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    update();
    const t = window.setTimeout(update, 80);
    const t2 = window.setTimeout(update, 320);
    const t3 = window.setTimeout(update, 640);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const interval = window.setInterval(update, 450);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [update, target, narrow]);

  const popoverStyle = narrow
    ? mobilePopoverStyle(rect)
    : rect
      ? desktopPopoverStyle(rect, placement)
      : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div
      className="fixed inset-0 z-[200] touch-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
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
              className="pointer-events-auto absolute rounded-[4px] border-2 border-primary ring-2 ring-primary/30 sm:ring-4"
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
        key={`${target}-popover-${narrow ? "m" : "d"}`}
        initial={{ opacity: 0, y: narrow ? 24 : 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto fixed z-[210] max-h-[min(70vh,420px)] overflow-y-auto rounded-[4px] border border-border bg-card shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]",
          narrow
            ? "touch-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "p-5",
          !rect &&
            !narrow &&
            "left-1/2 top-1/2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
          !rect &&
            narrow &&
            "inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))]"
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
            className="grid size-9 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:size-7"
          >
            <X className="size-4 sm:size-3.5" />
          </button>
        </div>
        <h2 className="mt-2 text-base font-bold tracking-tight sm:text-lg">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 sm:mt-5">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 px-1 text-xs text-muted-foreground transition hover:text-foreground sm:min-h-0"
          >
            Skip tour
          </button>
          <Button
            size={narrow ? "default" : "sm"}
            onClick={onNext}
            className="min-h-11 gap-1.5 px-5 sm:min-h-9"
          >
            {isLast ? "Get started" : "Next"}
            {!isLast && <ArrowRight className="size-4 sm:size-3.5" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
