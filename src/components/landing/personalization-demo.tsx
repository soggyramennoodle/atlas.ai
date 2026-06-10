"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

type Phase = "before" | "after";

/** A personalized token: rendered with a subtle highlight so the "made for you" bits read at a glance. */
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] bg-primary/12 px-1 text-primary">
      {children}
    </span>
  );
}

const SPRING = { type: "spring" as const, bounce: 0.42, duration: 0.75 };

/**
 * Loop that tells the story of the memory feature: a generic note glows with
 * the AI rainbow edge, bouncily morphs into a version tuned to the student,
 * the glow fades, it holds, then reverses — forever. Each entry sets the glow
 * and (optionally) the phase, then waits `ms` before the next.
 */
const SEQUENCE: { glow: boolean; phase?: Phase; ms: number }[] = [
  { glow: false, phase: "before", ms: 2200 }, // hold the generic note
  { glow: true, ms: 650 }, //                    rainbow glow ramps up
  { glow: true, phase: "after", ms: 1000 }, //   bouncy morph → personalized
  { glow: false, ms: 2600 }, //                  glow fades, hold personalized
  { glow: true, ms: 650 }, //                    glow ramps again
  { glow: true, phase: "before", ms: 1000 }, //  morph back → generic
];

export function PersonalizationDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("before");
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (reduce) return;
    let i = 1; // step 0 is the initial state; schedule from step 1 onward.
    let timer = window.setTimeout(function run() {
      const step = SEQUENCE[i];
      setGlow(step.glow);
      if (step.phase) setPhase(step.phase);
      i = (i + 1) % SEQUENCE.length;
      timer = window.setTimeout(run, step.ms);
    }, SEQUENCE[0].ms);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  // Reduced motion: show the meaningful end state, statically.
  const shown: Phase = reduce ? "after" : phase;

  return (
    <section className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Learns how you study
          </p>
          <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            The same lecture,{" "}
            <span className="text-primary">made for you.</span>
          </h2>
          <p className="mt-4 max-w-[48ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Atlas starts with thorough notes, then adapts them to your course,
            the terms you prefer, and the depth you like — a little more with
            every lecture. Watch a generic note become yours.
          </p>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <div className="mx-auto w-full max-w-[560px]">
            {/* Glow wrapper — never clip it, so the rainbow bloom can bleed out.
                Scale the wrapper (not just the card) so the glow stays locked to
                the card's border during the pulse. */}
            <motion.div
              animate={reduce ? undefined : { scale: glow ? 1.015 : 1 }}
              transition={SPRING}
              className="relative isolate rounded-[10px]"
            >
              <span
                aria-hidden
                className={cn(
                  "processing-glow",
                  !glow && "processing-glow--stopping"
                )}
              />
              <div
                className="overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={`label-${shown}`}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {shown === "after" ? (
                          <>
                            <Mark>BIO 1A03</Mark> · Lecture 12
                          </>
                        ) : (
                          "Lecture recording"
                        )}
                      </motion.p>
                    </AnimatePresence>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.h3
                        key={`title-${shown}`}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="mt-1 truncate text-[17px] font-semibold tracking-tight"
                      >
                        {shown === "after"
                          ? "Mitosis and the cell cycle"
                          : "Cell division"}
                      </motion.h3>
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {shown === "after" && (
                      <motion.span
                        initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
                        transition={SPRING}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary"
                      >
                        <Sparkles className="size-3" />
                        Made for you
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Body — fixed min-height so the morph doesn't reflow the page. */}
                <div className="relative min-h-[208px] px-5 py-5 sm:min-h-[196px] sm:px-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={shown}
                      initial={
                        reduce ? false : { opacity: 0, scale: 0.92, y: 12 }
                      }
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={
                        reduce ? undefined : { opacity: 0, scale: 0.96, y: -8 }
                      }
                      transition={SPRING}
                      className="space-y-4"
                    >
                      {shown === "after" ? <AfterNote /> : <BeforeNote />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Caption that names what changed. */}
            <div className="mt-4 h-5 text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`cap-${shown}`}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-muted-foreground"
                >
                  {shown === "after"
                    ? "Tuned to your course, your terms, and a worked example."
                    : "A standard set of notes."}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BeforeNote() {
  return (
    <>
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Summary
        </span>
        <p className="mt-2 text-[14px] leading-[1.65] text-foreground/80">
          Cells make copies of themselves. The cell splits in two, and each new
          cell gets a set of DNA.
        </p>
      </div>
      <div>
        <h4 className="text-[13px] font-semibold tracking-tight">Key concepts</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Cell", "DNA", "Splitting"].map((t) => (
            <span
              key={t}
              className="rounded-[4px] border border-border px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function AfterNote() {
  return (
    <>
      <div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
          <Sparkles className="size-3.5" />
          Summary
        </span>
        <p className="mt-2 text-[14px] leading-[1.65] text-foreground/85">
          The cell cycle drives division through <Mark>interphase</Mark> and{" "}
          <Mark>mitosis</Mark> (prophase → telophase). <Mark>Worked example</Mark>
          : a diploid cell with 2n = 4 produces two genetically identical
          daughter cells.
        </p>
      </div>
      <div>
        <h4 className="text-[13px] font-semibold tracking-tight">Key concepts</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Interphase", "Prophase → Telophase", "2n = 4 example"].map((t) => (
            <span
              key={t}
              className="rounded-[4px] border border-primary/25 bg-primary/5 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-primary/90"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
