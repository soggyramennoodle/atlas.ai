"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-12 pt-36 text-center sm:pt-44">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              Your smart study assistant
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-balance text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl"
          >
            Record the lecture.
            <br />
            Atlas writes the{" "}
            <span className="font-serif text-6xl font-normal italic text-primary sm:text-8xl">
              notes.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-7 max-w-xl text-pretty text-lg text-muted-foreground"
          >
            Upload any lecture recording and get thorough, structured notes —
            a clear summary, key concepts, and every detail captured. So you can
            actually listen in class.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group h-12 px-6 text-base">
              <Link href={ctaHref}>
                Upload a lecture
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
            className="mt-5 text-xs text-muted-foreground"
          >
            No card required · Your recordings stay private
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 w-full [perspective:1200px]"
        >
          <NotesPreview />
        </motion.div>
      </div>
    </section>
  );
}

function NotesPreview() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-[1.5rem] border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-red-400/70" />
        <span className="size-3 rounded-full bg-amber-400/70" />
        <span className="size-3 rounded-full bg-emerald-400/70" />
        <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
          <AudioLines className="size-3.5 text-primary" />
          lecture-09-thermodynamics.m4a
        </div>
      </div>
      <div className="grid gap-6 p-6 text-left sm:grid-cols-[1.4fr_1fr] sm:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Lecture 9
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            The Second Law of Thermodynamics
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            An overview of entropy as a measure of disorder, the Clausius
            statement, and why heat flows spontaneously from hot to cold.
          </p>
          <div className="mt-5 space-y-3">
            {[
              "Entropy (S) quantifies the number of microstates of a system.",
              "ΔS_universe ≥ 0 for any spontaneous process.",
              "Heat engines cannot be 100% efficient — Carnot sets the limit.",
            ].map((line) => (
              <div key={line} className="flex gap-2.5 text-sm">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key concepts
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="font-medium">Entropy</dt>
              <dd className="text-muted-foreground">
                A measure of a system&apos;s disorder.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Carnot efficiency</dt>
              <dd className="text-muted-foreground">
                Max efficiency, η = 1 − T_c/T_h.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
