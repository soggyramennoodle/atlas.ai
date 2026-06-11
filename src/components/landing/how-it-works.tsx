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
    title: "Get notes made for you",
    body: "A clean summary, fully detailed sections, and key concepts, saved to your library — and every lecture teaches Atlas a little more about your courses and style.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 overflow-hidden bg-[#fafafa] px-6 py-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mb-16 text-center">
          <p className="font-heading mb-4 text-[12px] font-medium tracking-[2px] text-black/45">
            HOW IT WORKS
          </p>
          <h2 className="m-0 text-[#0d0d0d]">
            <span
              className="font-heading block font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              From recording to
            </span>
            <span
              className="font-instrument block italic font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              study-ready in three steps
            </span>
          </h2>
        </Reveal>

        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12} className="flex-1">
              <div
                className="relative flex h-full flex-col rounded-[24px] border border-black/[0.08] bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-[14px] border border-black/10 bg-black/[0.04] text-[#0d0d0d]">
                    <step.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="font-heading text-5xl font-light leading-none tabular-nums text-black/10">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-heading mt-6 text-xl font-medium tracking-tight text-[#0d0d0d]">
                  {step.title}
                </h3>
                <p className="font-heading mt-2 text-[13px] leading-[1.6] text-black/60">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
