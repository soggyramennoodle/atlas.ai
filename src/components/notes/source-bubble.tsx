"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, Sparkles } from "lucide-react";
import { MathText } from "./math-text";

/**
 * A note bullet that, on hover for >800ms, reveals the transcript excerpt it
 * was sourced from (§9 groundwork). The bubble appears on whichever side has
 * more room, with a fade+scale entrance. Renders a plain bullet when no
 * `excerpt` is available, so older notes are unaffected.
 *
 * The `"ai"` status marks a line Atlas generated (via "Add to note"): it always
 * shows its bubble — even without an excerpt — with an honest "verify this"
 * note, so AI additions are never mistaken for lecture content.
 */
export function SourceBullet({
  text,
  excerpt,
  status = "lecture",
  children,
}: {
  text: string;
  excerpt?: string;
  status?: "lecture" | "edited" | "research" | "ai";
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
  const ai = status === "ai";
  // Research and AI lines always show their bubble (they carry a verify note),
  // even when no excerpt is present.
  const showBubble = !!excerpt || research || ai;

  if (!showBubble)
    return (
      <span className="text-pretty">
        {children ?? <MathText text={text} />}
      </span>
    );

  const label =
    status === "ai"
      ? "Added by Atlas"
      : status === "research"
        ? "Researched online"
        : status === "edited"
          ? "Lecture-based, edited"
          : "From the lecture";

  const bubbleBody =
    status === "research"
      ? excerpt ??
        "Supplementary context from web research. Verify important details against your course materials."
      : status === "ai"
        ? excerpt ??
          "Atlas expanded on this line for you. It was generated, not taken from the lecture."
        : excerpt;

  // AI = violet (matches the AI edge-glow language); research = amber; lecture = ink.
  const decoration = ai
    ? "decoration-violet-500/50 hover:decoration-violet-500/80"
    : research
      ? "decoration-amber-500/50 hover:decoration-amber-500/80"
      : "decoration-black/20 hover:decoration-black/50";
  const headColor = ai
    ? "text-violet-600"
    : research
      ? "text-amber-600"
      : "text-[#0d0d0d]/70";

  return (
    <span
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative cursor-help text-pretty underline decoration-dotted underline-offset-4 transition ${decoration}`}
    >
      {children ?? <MathText text={text} />}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`absolute top-1/2 z-30 w-72 -translate-y-1/2 rounded-2xl border border-black/[0.08] bg-white p-3.5 text-sm shadow-[0_18px_50px_-28px_rgba(0,0,0,0.35)] ${
              side === "right" ? "left-full ml-3" : "right-full mr-3"
            }`}
          >
            <span
              className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] ${headColor}`}
            >
              {ai ? <Sparkles className="size-3" /> : <Quote className="size-3" />}
              {label}
            </span>
            <span className="block text-pretty leading-relaxed text-[#0d0d0d]/60">
              {research ? (
                <>
                  {bubbleBody}
                  <span className="mt-2 block text-xs text-amber-700/90">
                    Verify important details — this was not said in the lecture.
                  </span>
                </>
              ) : ai ? (
                <>
                  {bubbleBody}
                  <span className="mt-2 block text-xs text-violet-700/90">
                    Verify against your course materials.
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
