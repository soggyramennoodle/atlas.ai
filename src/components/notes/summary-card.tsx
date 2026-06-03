"use client";

import { Sparkles } from "lucide-react";
import { AiGlow } from "@/components/ui/ai-glow";

/**
 * The lecture summary, wrapped in the shared ambient AI glow (§4/§6). The glow
 * is always-on but compositor-only (transform/opacity CSS keyframes that pause
 * off-screen), so it reads as clearly alive without costing scroll performance.
 */
export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[1.5rem] border bg-primary/[0.04] p-6 sm:p-7">
      <AiGlow mode="idle" blur={56} className="opacity-50" />

      <div className="relative">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" />
          Summary
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-foreground/90">
          {summary}
        </p>
      </div>
    </section>
  );
}
