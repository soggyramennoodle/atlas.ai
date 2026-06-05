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
      className="render-section mx-auto max-w-5xl scroll-mt-24 px-4 py-28"
    >
      <Reveal className="max-w-2xl">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          From recording to study-ready, in three steps.
        </h2>
        <p className="mt-4 max-w-md text-pretty text-muted-foreground">
          No setup, no formatting, no scrambling to keep up. You press record;
          Atlas does the rest.
        </p>
      </Reveal>

      {/* Vertical timeline — one connected spine, not a row of equal cards. */}
      <ol className="mt-16 max-w-2xl">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.1}>
            <li className="relative grid grid-cols-[auto_1fr] gap-x-6 pb-12 last:pb-0">
              {/* connecting line */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[1.6rem] top-14 bottom-2 w-px bg-gradient-to-b from-primary/40 to-border"
                />
              )}
              <div className="relative grid size-[3.25rem] place-items-center rounded-2xl border bg-card/70 text-primary ring-1 ring-primary/15">
                <step.icon className="size-6" />
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border bg-background font-mono text-[0.7rem] text-muted-foreground">
                  {i + 1}
                </span>
              </div>
              <div className="pt-1.5">
                <h3 className="text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-md text-pretty leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
