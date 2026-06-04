"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-32">
      {/* Gradient mesh. Kept static: it spans the full hero behind frosted
          glass surfaces (badge, capture card), and animating a full-bleed
          backdrop forces those glass layers to re-blur every frame — the cause
          of the Chrome GPU stall. */}
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(60%_55%_at_50%_35%,black,transparent)]" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex justify-center">
            <span className="group inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
              <AudioLines className="size-3.5" />
              A note taker, made for you
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-8 text-balance text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl lg:text-[5.5rem]"
          >
            Sit back and listen.
            <br />
            <span className="text-muted-foreground">We&apos;ll remember</span>{" "}
            <span className="font-display text-6xl font-semibold tracking-tight sm:text-8xl lg:text-[6.5rem]">
              <span className="text-gradient-brand animate-gradient">
                every word.
              </span>
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-8 max-w-xl text-pretty text-lg text-muted-foreground"
          >
            Record any lecture straight from your browser and Atlas hands back
            thorough, structured notes — a clear summary, key concepts, every
            detail captured. So you can finally be present in class.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group shimmer h-12 px-6 text-base">
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
              className="h-12 px-6 text-base"
            >
              <Link href="/#how">See how it works</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-6 font-mono text-xs text-muted-foreground"
          >
            No card required · Your recordings stay private
          </motion.p>
        </motion.div>

        {/* Floating orbital centerpiece */}
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          className="relative mt-16 w-full max-w-3xl"
        >
          <OrbitVisual />
        </motion.div>
      </div>

      {/* scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-muted-foreground/30 p-1">
          <motion.span
            className="size-1.5 rounded-full bg-primary"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}

/**
 * The hero centerpiece: rotating orbit rings behind a floating glass
 * "capture" card that animates a waveform resolving into note lines.
 */
function OrbitVisual() {
  return (
    <div className="relative [perspective:1400px]">
      {/* orbit rings */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-spin-slow">
          <div className="size-[34rem] rounded-full border border-primary/10" />
        </div>
        <div className="absolute inset-0 grid place-items-center animate-spin-reverse">
          <div className="size-[24rem] rounded-full border border-primary/15 [border-style:dashed]" />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="size-[40rem] rounded-full bg-primary/5 blur-3xl" />
        </div>
      </div>

      {/* Self-frosted, NOT a live backdrop-filter. This card floats
          (animate-float), so a real backdrop blur would re-rasterize its
          backdrop every frame — doubly so over the drifting blooms behind it.
          A translucent fill + the specular ring keeps the glass read while
          staying compositor-cheap. */}
      <motion.div
        className="animate-float relative mx-auto w-full max-w-2xl overflow-hidden rounded-[1.75rem] border bg-card/85 ring-luxe"
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center gap-2 border-b border-foreground/10 bg-background/30 px-4 py-3">
          <span className="size-3 rounded-full bg-red-400/60" />
          <span className="size-3 rounded-full bg-amber-400/60" />
          <span className="size-3 rounded-full bg-emerald-400/60" />
          <div className="ml-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            recording · 41:08
          </div>
        </div>
        <div className="grid gap-6 p-6 text-left sm:grid-cols-[1fr_1.3fr] sm:p-7">
          {/* live waveform */}
          <div className="flex flex-col justify-between rounded-2xl border bg-background/40 p-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-primary">
              Live audio
            </p>
            <div className="flex h-20 items-end justify-center gap-[3px]">
              {Array.from({ length: 22 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="h-full w-[3px] origin-bottom rounded-full bg-gradient-to-t from-primary/40 to-primary transform-gpu"
                  animate={{ scaleY: [0.18, 0.85, 0.32, 0.7, 0.2] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.06,
                  }}
                  style={{ scaleY: 0.3 }}
                />
              ))}
            </div>
            <p className="font-mono text-[0.65rem] text-muted-foreground">
              transcribing…
            </p>
          </div>

          {/* notes resolving */}
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-primary">
              Atlas notes
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
              The Second Law of Thermodynamics
            </h3>
            <div className="mt-4 space-y-2.5">
              {[
                "Entropy quantifies a system's microstates.",
                "ΔS_universe ≥ 0 for spontaneous change.",
                "Carnot bounds every heat engine's efficiency.",
              ].map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.5, duration: 0.5 }}
                  className="flex gap-2.5 text-sm text-foreground/90"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
