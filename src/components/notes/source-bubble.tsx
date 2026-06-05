"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote } from "lucide-react";

/**
 * A note bullet that, on hover for >800ms, reveals the transcript excerpt it
 * was sourced from (§9 groundwork). The bubble appears on whichever side has
 * more room, with a fade+scale entrance. Renders a plain bullet when no
 * `excerpt` is available, so older notes are unaffected.
 */
export function SourceBullet({
  text,
  excerpt,
  status = "lecture",
  children,
}: {
  text: string;
  excerpt?: string;
  status?: "lecture" | "edited";
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function onEnter() {
    if (!excerpt) return;
    timer.current = setTimeout(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        // Put the bubble where there's more space.
        setSide(rect.left > window.innerWidth - rect.right ? "left" : "right");
      }
      setShow(true);
    }, 800);
  }

  function onLeave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShow(false);
  }

  if (!excerpt) return <span className="text-pretty">{children ?? text}</span>;

  const label = status === "edited" ? "Lecture-based, edited" : "From the lecture";

  return (
    <span
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="relative cursor-help text-pretty underline decoration-primary/25 decoration-dotted underline-offset-4 transition hover:decoration-primary/60"
    >
      {children ?? text}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`absolute top-1/2 z-30 w-72 -translate-y-1/2 rounded-[4px] border bg-popover p-3.5 text-sm shadow-2xl ${
              side === "right" ? "left-full ml-3" : "right-full mr-3"
            }`}
          >
            <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-primary">
              <Quote className="size-3" />
              {label}
            </span>
            <span className="block text-pretty italic leading-relaxed text-muted-foreground">
              “{excerpt}”
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
