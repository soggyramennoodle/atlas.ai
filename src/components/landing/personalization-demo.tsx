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
    <span className="rounded-[4px] bg-black/[0.07] px-1 font-medium text-[#0d0d0d]">
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
    <section className="scroll-mt-20 overflow-hidden bg-[#fafafa] px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <Reveal className="lg:col-span-5">
          <p className="font-heading text-[12px] font-medium tracking-[2px] text-black/45">
            LEARNS HOW YOU STUDY
          </p>
          <h2 className="mt-4 text-balance text-[#0d0d0d]">
            <span
              className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
            >
              The same lecture,{" "}
            </span>
            <span
              className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
              style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}
            >
              made for you.
            </span>
          </h2>
          <p className="font-heading mt-4 max-w-[48ch] text-pretty text-[15px] leading-[1.6] text-black/60">
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
              className="relative isolate rounded-[20px]"
            >
              <span
                aria-hidden
                className={cn(
                  "processing-glow",
                  !glow && "processing-glow--stopping"
                )}
              />
              <div
                className="overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={`label-${shown}`}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        className="font-heading text-[11px] uppercase tracking-[1.5px] text-black/45"
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
                        className="font-heading mt-1 truncate text-[17px] font-medium tracking-tight text-[#0d0d0d]"
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
                        className="font-heading inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[1.5px] text-black/60"
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
                  className="font-heading text-[13px] text-black/50"
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
      </div>
    </section>
  );
}

function BeforeNote() {
  return (
    <>
      <div>
        <span className="font-heading text-[11px] uppercase tracking-[1.5px] text-black/45">
          Summary
        </span>
        <p className="mt-2 font-heading text-[14px] leading-[1.65] text-black/70">
          Cells make copies of themselves. The cell splits in two, and each new
          cell gets a set of DNA.
        </p>
      </div>
      <div>
        <h4 className="font-heading text-[13px] font-medium tracking-tight text-[#0d0d0d]">Key concepts</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Cell", "DNA", "Splitting"].map((t) => (
            <span
              key={t}
              className="font-heading rounded-full border border-black/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[1px] text-black/55"
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
        <span className="font-heading inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[1.5px] text-[#0d0d0d]">
          <Sparkles className="size-3.5" />
          Summary
        </span>
        <p className="mt-2 font-heading text-[14px] leading-[1.65] text-black/75">
          The cell cycle drives division through <Mark>interphase</Mark> and{" "}
          <Mark>mitosis</Mark> (prophase → telophase). <Mark>Worked example</Mark>
          : a diploid cell with 2n = 4 produces two genetically identical
          daughter cells.
        </p>
      </div>
      <div>
        <h4 className="font-heading text-[13px] font-medium tracking-tight text-[#0d0d0d]">Key concepts</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Interphase", "Prophase → Telophase", "2n = 4 example"].map((t) => (
            <span
              key={t}
              className="font-heading rounded-full border border-black/15 bg-black/[0.04] px-2.5 py-1 text-[10.5px] uppercase tracking-[1px] text-[#0d0d0d]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
