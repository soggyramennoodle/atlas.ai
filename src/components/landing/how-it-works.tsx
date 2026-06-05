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
      className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 md:py-28"
    >
      <Reveal className="max-w-[760px]">
        <h2 className="text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          From recording to <span className="text-primary">study-ready</span> in
          three steps.
        </h2>
      </Reveal>

      <div className="mt-14 overflow-hidden rounded-[4px] border border-border">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.08}>
            <div className="group icon-animate grid grid-cols-[auto_1fr] items-start gap-5 border-t border-border bg-card px-5 py-8 transition-colors first:border-t-0 hover:bg-secondary sm:grid-cols-[6rem_auto_1fr] sm:items-center sm:gap-8 sm:px-10">
              <span className="text-5xl font-bold leading-none tabular-nums text-foreground/10 transition-colors group-hover:text-primary/25 sm:text-7xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="hidden size-12 place-items-center rounded-[4px] border border-border bg-background text-foreground sm:grid">
                <step.icon className="size-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-lg text-pretty leading-relaxed text-muted-foreground">
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
