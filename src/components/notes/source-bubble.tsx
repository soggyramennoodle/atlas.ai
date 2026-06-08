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
  status?: "lecture" | "edited" | "research";
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function onEnter() {
    if (!showBubble) return;
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

  const research = status === "research";
  const showBubble = !!excerpt || research;

  if (!showBubble) return <span className="text-pretty">{children ?? text}</span>;

  const label =
    status === "research"
      ? "Researched online"
      : status === "edited"
        ? "Lecture-based, edited"
        : "From the lecture";

  const bubbleBody =
    status === "research"
      ? excerpt ??
        "Supplementary context from web research. Verify important details against your course materials."
      : excerpt;

  return (
    <span
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative cursor-help text-pretty underline decoration-dotted underline-offset-4 transition ${
        research
          ? "decoration-amber-500/50 hover:decoration-amber-500/80"
          : "decoration-primary/25 hover:decoration-primary/60"
      }`}
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
            <span
              className={`mb-1.5 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider ${
                research ? "text-amber-600 dark:text-amber-400" : "text-primary"
              }`}
            >
              <Quote className="size-3" />
              {label}
            </span>
            <span className="block text-pretty leading-relaxed text-muted-foreground">
              {research ? (
                <>
                  {bubbleBody}
                  <span className="mt-2 block text-xs text-amber-700/90 dark:text-amber-300/90">
                    Verify important details — this was not said in the lecture.
                  </span>
                </>
              ) : (
                <span className="italic">“{bubbleBody}”</span>
              )}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
