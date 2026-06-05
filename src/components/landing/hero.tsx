"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiGlow } from "@/components/ui/ai-glow";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-4 pb-24 pt-32 sm:pt-28">
      {/* The living glow is a large, bleeding presence behind the type. */}
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute -right-[15%] top-[8%] h-[42rem] w-[42rem] max-w-[90vw] opacity-80">
        <AiGlow mode="active" blend density="full" blur={72} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(75%_60%_at_30%_40%,black,transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative mx-auto w-full max-w-6xl">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
              <AudioLines className="size-3.5" />
              A note taker, made for you
            </span>
          </motion.div>

          {/* Oversized editorial headline. */}
          <motion.h1
            variants={item}
            className="mt-8 font-display text-[19vw] font-extrabold leading-[0.82] tracking-[-0.04em] sm:text-[15vw] lg:text-[10.5rem]"
          >
            Sit back
            <br />
            and listen.
          </motion.h1>

          <motion.div
            variants={item}
            className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
          >
            <p className="max-w-md text-pretty text-lg text-muted-foreground sm:text-xl">
              <span className="text-gradient-brand font-display text-2xl font-bold sm:text-3xl">
                We&apos;ll remember every word.
              </span>
              <br />
              Record any lecture in your browser and Atlas hands back thorough,
              structured notes.
            </p>

            <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="group shimmer magnetic h-12 px-7 text-base"
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
                className="magnetic h-12 px-7 text-base"
              >
                <Link href="/#how">See how it works</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
