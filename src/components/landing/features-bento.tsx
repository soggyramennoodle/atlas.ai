"use client";

import { motion } from "framer-motion";
import {
  ListChecks,
  Layers,
  BookMarked,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

function Cell({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        "glow-card group relative overflow-hidden rounded-[1.75rem] border bg-card/70 p-6 transition hover:border-primary/30",
        className
      )}
    >
      {children}
    </Reveal>
  );
}

/** Looping waveform that "writes" note lines. */
function WaveToNotes() {
  return (
    <div className="mt-6 flex items-end gap-4">
      <div className="flex h-24 items-center gap-[3px]">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-primary/40 to-primary"
            animate={{ height: ["20%", "90%", "35%", "65%", "25%"] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.07,
            }}
            style={{ height: "40%" }}
          />
        ))}
      </div>
      <div className="flex-1 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 rounded-full bg-foreground/10"
            animate={{ width: ["40%", "90%", "60%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A particle orbiting a definition dot. */
function OrbitDot() {
  return (
    <div className="mt-6 grid h-24 place-items-center">
      <div className="relative size-20">
        <div className="absolute inset-0 rounded-full border border-dashed border-primary/25" />
        <div className="absolute inset-0 animate-spin-slow">
          <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px] shadow-primary/60" />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="size-3 rounded-full bg-primary/70" />
        </div>
      </div>
    </div>
  );
}

/** Pulsing concentric clock ring. */
function PulseClock() {
  return (
    <div className="mt-6 grid h-24 place-items-center">
      <div className="relative grid size-16 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20 animate-pulse-ring">
        <Clock className="size-6 text-primary" />
      </div>
    </div>
  );
}

/** Fanned, breathing stack of cards. */
function FannedCards() {
  return (
    <div className="mt-6 grid h-24 place-items-center">
      <div className="relative h-16 w-24">
        {[-8, 0, 8].map((deg, i) => (
          <motion.div
            key={deg}
            className="absolute left-1/2 top-1/2 h-16 w-12 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background/70"
            style={{ rotate: deg, originY: 1 }}
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function FeaturesBento() {
  return (
    <section id="features" className="scroll-mt-24 border-y bg-card/20 py-28">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            Features
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything you need from a lecture,{" "}
            <span className="font-serif font-normal italic text-primary">
              written down
            </span>
          </h2>
        </Reveal>

        <div className="mt-16 grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Hero cell */}
          <Cell className="sm:col-span-2 lg:row-span-2">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <ListChecks className="size-5" />
            </span>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              Notes that miss nothing
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Detailed, structured notes that capture examples, formulas and
              asides — not a three-line summary. Atlas writes them the way a
              diligent student would, in full.
            </p>
            <WaveToNotes />
          </Cell>

          <Cell delay={0.06}>
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Layers className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold tracking-tight">A summary up top</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Each lecture opens with a short overview, so you recall the gist in
              seconds.
            </p>
            <OrbitDot />
          </Cell>

          <Cell delay={0.12}>
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <BookMarked className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold tracking-tight">
              Your personal library
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Every lecture saved and searchable — a notebook for the whole term.
            </p>
            <FannedCards />
          </Cell>

          <Cell delay={0.06}>
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Clock className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold tracking-tight">Any lecture length</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              From a 20-minute seminar to a three-hour lab, powered by long-audio
              understanding.
            </p>
            <PulseClock />
          </Cell>

          <Cell delay={0.12} className="sm:col-span-2">
            <div className="flex items-start justify-between gap-6">
              <div>
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ShieldCheck className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">
                  Private by default
                </h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Recordings and notes are tied to your account and protected
                  with database row-level security. Your keys never leave the
                  server.
                </p>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="relative grid size-20 place-items-center rounded-2xl border bg-background/40 animate-breathe">
                  <ShieldCheck className="size-8 text-primary" />
                </div>
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
