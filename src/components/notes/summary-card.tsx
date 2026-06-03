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
      {/* Two counter-drifting multicolor aurora layers behind the text. They
          breathe and shift on mismatched loops so the gradient feels alive
          rather than static (§6). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-24 opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(40% 50% at 30% 30%, oklch(0.79 0.106 86 / 0.4), transparent 70%), radial-gradient(38% 46% at 78% 58%, oklch(0.68 0.16 290 / 0.32), transparent 70%), radial-gradient(42% 42% at 55% 88%, oklch(0.66 0.16 250 / 0.3), transparent 70%)",
        }}
        animate={{
          x: ["-5%", "6%", "-3%", "-5%"],
          y: ["-3%", "5%", "-4%", "-3%"],
          scale: [1, 1.12, 1.04, 1],
          rotate: [0, 8, -4, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.4, 0.7, 1],
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-32 opacity-40 blur-3xl mix-blend-screen"
        style={{
          background:
            "radial-gradient(36% 44% at 65% 35%, oklch(0.72 0.15 330 / 0.3), transparent 70%), radial-gradient(40% 40% at 22% 70%, oklch(0.74 0.13 160 / 0.26), transparent 70%)",
        }}
        animate={{
          x: ["4%", "-6%", "2%", "4%"],
          y: ["2%", "-5%", "4%", "2%"],
          scale: [1.05, 0.95, 1.1, 1.05],
          rotate: [0, -6, 5, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.35, 0.7, 1],
        }}
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
