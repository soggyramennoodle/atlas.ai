"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export type LearningState = "learning" | "done" | null;

/**
 * The "Atlas is learning from your edits…" treatment shown after a user saves
 * edited notes (§2). Renders a soft rainbow/aurora glow that pulses around the
 * note container plus a floating status pill. The parent blurs its own content
 * while this is active. Purely presentational — driven by `state`.
 */
export function LearningOverlay({ state }: { state: LearningState }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key="learning"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute -inset-3 z-20"
        >
          {/* Rotating rainbow/aurora ring hugging the container edges. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-[2rem] opacity-70 blur-md"
            style={{
              background:
                "conic-gradient(from var(--a,0deg), oklch(0.79 0.106 86), oklch(0.7 0.12 320), oklch(0.72 0.12 250), oklch(0.74 0.13 160), oklch(0.79 0.106 86))",
              padding: 2,
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
            animate={
              state === "learning"
                ? { rotate: 360, opacity: [0.45, 0.85, 0.45] }
                : { opacity: 0.5 }
            }
            transition={{
              rotate: { duration: 3.5, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Floating status pill. */}
          <div className="absolute inset-x-0 top-6 flex justify-center">
            <AnimatePresence mode="wait">
              {state === "learning" ? (
                <motion.div
                  key="learning-pill"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="flex items-center gap-2.5 rounded-full border border-primary/30 bg-card/90 px-4 py-2 text-sm font-medium shadow-2xl backdrop-blur-xl ring-luxe"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                    className="text-primary"
                  >
                    <Sparkles className="size-4" />
                  </motion.span>
                  Atlas is learning from your edits…
                </motion.div>
              ) : (
                <motion.div
                  key="done-pill"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="flex items-center gap-2.5 rounded-full border border-emerald-500/40 bg-card/90 px-4 py-2 text-sm font-medium shadow-2xl backdrop-blur-xl"
                >
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check className="size-3.5" />
                  </span>
                  Saved — Atlas updated its memory
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
