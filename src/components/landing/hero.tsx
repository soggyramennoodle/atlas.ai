"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiGlow } from "@/components/ui/ai-glow";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-20 pt-28 sm:pt-24">
      {/* Static gradient mesh: a full-bleed backdrop behind frosted glass, so
          animating it would force every glass layer to re-blur each frame. */}
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_30%_30%,black,transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Left: the message, left-aligned. */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-7"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
              <AudioLines className="size-3.5" />
              A note taker, made for you
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 text-balance text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Sit back and listen.
            <br />
            <span className="text-muted-foreground">We&apos;ll remember</span>{" "}
            <span className="text-gradient-brand animate-gradient font-display">
              every word.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-7 max-w-md text-pretty text-lg text-muted-foreground"
          >
            Record any lecture in your browser. Atlas hands back thorough,
            structured notes, so you can be present in class.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
          >
            <Button
              asChild
              size="lg"
              className="group shimmer magnetic h-12 px-6 text-base"
            >
              <Link href={ctaHref}>
                <Mic className="size-4" />
                Record a lecture
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="magnetic h-12 px-6 text-base"
            >
              <Link href="/#how">See how it works</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right: a living field of light, not a boxed app window. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          className="lg:col-span-5"
        >
          <HeroGlow />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The hero centerpiece: the shared living AI glow suspended inside slow orbit
 * rings, with one soft glass chip resolving a waveform into note lines. No
 * window chrome, no traffic-light dots — light that feels alive, not a box.
 */
function HeroGlow() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md [perspective:1400px]">
      {/* Orbit rings — slow, ambient depth. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="animate-spin-slow">
          <div className="size-[26rem] max-w-[92vw] rounded-full border border-primary/10" />
        </div>
        <div className="absolute inset-0 grid place-items-center animate-spin-reverse">
          <div className="size-[19rem] max-w-[78vw] rounded-full border border-primary/15 [border-style:dashed]" />
        </div>
      </div>

      {/* The living glow itself — fluid, organic, masked to a soft orb. */}
      <div className="absolute inset-6 overflow-hidden rounded-full">
        <AiGlow mode="active" blend density="full" blur={56} />
      </div>

      {/* One floating, soft product hint — a chip, not a screenshot. */}
      <motion.div
        className="animate-float absolute -bottom-2 left-1/2 w-[78%] -translate-x-1/2 rounded-[1.5rem] border bg-card/80 p-4 ring-luxe"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 items-end gap-[2.5px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="h-full w-[2.5px] origin-bottom rounded-full bg-gradient-to-t from-primary/40 to-primary transform-gpu"
                style={{
                  transform: "scaleY(0.3)",
                  animation: `atlas-wave 1.6s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-primary">
            transcribing
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[88, 64].map((w, i) => (
            <div
              key={w}
              className="h-1.5 origin-left rounded-full bg-foreground/10 transform-gpu"
              style={{
                width: `${w}%`,
                animation: `atlas-line 3s ease-in-out ${(i * 0.4).toFixed(2)}s infinite`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
