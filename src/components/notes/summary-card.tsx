"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * The lecture summary, wrapped in a continuous ambient aurora glow (§9) that
 * marks it as AI-generated. The glow drifts and breathes on a loop rather than
 * only on hover.
 */
export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border bg-primary/[0.04] p-6 sm:p-7">
      {/* Drifting aurora layers behind the text. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-24 opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(40% 50% at 30% 30%, oklch(0.79 0.106 86 / 0.35), transparent 70%), radial-gradient(35% 45% at 75% 60%, oklch(0.72 0.12 250 / 0.28), transparent 70%), radial-gradient(40% 40% at 55% 85%, oklch(0.74 0.13 160 / 0.22), transparent 70%)",
        }}
        animate={{
          x: ["-4%", "5%", "-4%"],
          y: ["-3%", "4%", "-3%"],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-3.5" />
          </motion.span>
          Summary
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-foreground/90">
          {summary}
        </p>
      </div>
    </section>
  );
}
