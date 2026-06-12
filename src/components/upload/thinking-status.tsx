"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Playful, made-up status lines that rotate while Atlas "thinks". We can't read
 * real model progress, so these just keep the wait from feeling dead — each one
 * crossfades to the next every few seconds. Shared by the in-browser recorder
 * and the file uploader so both processing screens feel alive in the same way.
 */
const THINKING_LINES = [
  "Transcribing the audio…",
  "Filtering out background noise…",
  "Following the thread of the lecture…",
  "Picking out the key concepts…",
  "Catching definitions and formulas…",
  "Connecting related ideas…",
  "Drafting clean, structured notes…",
  "Highlighting what matters most…",
  "Tidying up the final layout…",
  "Almost there, adding the finishing touches…",
];

/** Rotating status text that swaps every ~4.5s with a soft crossfade. */
export function ThinkingStatus({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((p) => (p + 1) % THINKING_LINES.length),
      4500
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-3 flex h-6 items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={className ?? "text-pretty text-sm leading-6 text-[#0d0d0d]/60"}
        >
          {THINKING_LINES[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
