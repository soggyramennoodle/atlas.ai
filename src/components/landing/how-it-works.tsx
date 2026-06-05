"use client";

import { Mic, Ear, NotebookPen } from "lucide-react";
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
    body: "A clean summary, fully detailed sections, and key concepts, saved to your library and ready to study.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="render-section mx-auto max-w-6xl scroll-mt-24 px-4 py-32"
    >
      <Reveal className="max-w-3xl">
        <h2 className="font-display text-5xl font-extrabold leading-[0.9] tracking-[-0.03em] sm:text-7xl">
          From recording to
          <br />
          <span className="text-gradient-brand">study-ready</span> in three steps.
        </h2>
      </Reveal>

      <div className="mt-20 space-y-px overflow-hidden rounded-[1.75rem] border bg-border">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.08}>
            <div className="group relative grid grid-cols-[auto_1fr] items-center gap-6 bg-card/70 px-6 py-10 transition-colors hover:bg-card sm:grid-cols-[8rem_auto_1fr] sm:gap-10 sm:px-12">
              {/* Oversized ghost numeral. */}
              <span className="font-display text-6xl font-extrabold leading-none text-primary/15 transition-colors group-hover:text-primary/30 sm:text-8xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="hidden size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 sm:grid">
                <step.icon className="size-7" />
              </span>
              <div>
                <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-lg text-pretty leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
