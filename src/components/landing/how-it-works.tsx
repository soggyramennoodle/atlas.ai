"use client";

import { Mic, Ear, NotebookPen } from "lucide-react";
import { TiltCard } from "@/components/landing/tilt-card";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    icon: Mic,
    title: "Record the lecture",
    body: "Press record in your browser when class starts and let it run. Prefer a file you already have? Upload that instead.",
  },
  {
    icon: Ear,
    title: "Atlas listens closely",
    body: "It transcribes and understands the whole lecture, following the structure the way an attentive student would.",
  },
  {
    icon: NotebookPen,
    title: "Get thorough notes",
    body: "A clean summary, fully detailed sections, and key concepts — saved to your library, ready to study.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="render-section mx-auto max-w-6xl scroll-mt-24 px-4 py-28"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
          How it works
        </p>
        <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          From recording to{" "}
          <span className="font-display font-semibold tracking-tight text-primary">
            study-ready
          </span>{" "}
          in three steps
        </h2>
      </Reveal>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.12}>
            <TiltCard className="group relative h-full overflow-hidden rounded-[1.75rem] border bg-card/70 p-7 glow-card">
              {/* Oversized static glyph: depth without scroll-linked JS work. */}
              <span
                className="pointer-events-none absolute -right-2 -top-8 select-none font-display text-[9rem] leading-none text-primary/[0.07]"
              >
                {i + 1}
              </span>
              <div className="relative [transform:translateZ(40px)]">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
