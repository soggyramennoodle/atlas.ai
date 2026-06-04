"use client";

import Link from "next/link";
import {
  ListChecks,
  Layers,
  BookMarked,
  Clock,
  ArrowRight,
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
        "glow-card group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-card/80 p-6 transition hover:border-primary/30 hover:-translate-y-0.5",
        className
      )}
    >
      {children}
    </Reveal>
  );
}

/** Looping waveform that "writes" note lines — fills the tall hero card. */
function WaveToNotes() {
  return (
    <div className="mt-6 flex flex-1 flex-col gap-4 rounded-2xl border bg-background/30 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 items-end gap-[3px]">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="h-full w-[3px] origin-bottom rounded-full bg-gradient-to-t from-primary/40 to-primary transform-gpu"
              style={{
                transform: "scaleY(0.4)",
                animation: `atlas-wave 1.8s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-primary">
          transcribing…
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-2 w-full origin-left rounded-full bg-foreground/10 transform-gpu"
            style={{
              transform: "scaleX(0.4)",
              animation: `atlas-line 3s ease-in-out ${(i * 0.35).toFixed(2)}s infinite`,
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
    <div className="mt-6 grid h-24 flex-1 place-items-center">
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
    <div className="mt-6 grid h-24 flex-1 place-items-center">
      <div className="relative grid size-16 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20 animate-pulse-ring">
        <Clock className="size-6 text-primary" />
      </div>
    </div>
  );
}

/** Realistic, tangible note cards — what a student would actually have. */
function LibraryCards() {
  const cards = [
    {
      title: "Lecture 4 — Mitosis",
      tag: "Biology",
      x: -52,
      rot: -7,
      z: 10,
      lines: 3,
    },
    {
      title: "Limits & Continuity",
      tag: "Calculus",
      x: 0,
      rot: 2,
      z: 20,
      lines: 4,
    },
    {
      title: "The French Revolution",
      tag: "History",
      x: 52,
      rot: 8,
      z: 10,
      lines: 3,
    },
  ];
  return (
    <div className="mt-6 grid h-40 flex-1 place-items-center">
      <div className="relative h-36 w-full">
        {cards.map((c) => (
          <div
            key={c.title}
            className="absolute left-1/2 top-1/2 w-36 rounded-xl border border-border/80 bg-gradient-to-b from-card to-background/80 p-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)]"
            style={{
              transform: `translate(-50%, -50%) translateX(${c.x}px) rotate(${c.rot}deg)`,
              zIndex: c.z,
            }}
          >
            <p className="truncate text-[0.7rem] font-semibold tracking-tight text-foreground/90">
              {c.title}
            </p>
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: c.lines }).map((_, j) => (
                <div
                  key={j}
                  className="h-1.5 rounded-full bg-foreground/10"
                  style={{ width: `${90 - j * 14}%` }}
                />
              ))}
            </div>
            <span className="mt-2.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] font-medium text-primary">
              {c.tag}
            </span>
          </div>
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
            <span className="font-display font-semibold tracking-tight text-primary">
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
            <LibraryCards />
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

          {/* Atlas Enclave — privacy. Lock emoji is part of the brand (§3d). */}
          <Cell delay={0.12} className="sm:col-span-2">
            <div className="flex h-full items-start justify-between gap-6">
              <div className="flex h-full flex-col">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-xl leading-none ring-1 ring-primary/20">
                  🔒
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">
                  Atlas Enclave
                </h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Recordings and notes live in a private space tied to your
                  account and protected with database row-level security. Never
                  sold, never shared, never used to train anyone else&apos;s AI.
                </p>
                <Link
                  href="/privacy"
                  className="group/cta mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  Learn how we protect you
                  <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="relative grid size-20 place-items-center rounded-2xl border bg-background/40 text-3xl animate-breathe">
                  🔒
                </div>
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
