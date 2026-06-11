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
      className="scroll-mt-20 overflow-hidden bg-[#000] px-6 py-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mb-16 text-center">
          <p className="font-heading mb-4 text-[12px] font-medium tracking-[2px] text-white/50">
            HOW IT WORKS
          </p>
          <h2 className="m-0 text-white">
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
                className="relative flex h-full flex-col rounded-[24px] border border-white/[0.12] p-7"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-[14px] border border-white/15 bg-white/10 text-white">
                    <step.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="font-heading text-5xl font-light leading-none tabular-nums text-white/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-heading mt-6 text-xl font-medium tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="font-heading mt-2 text-[13px] leading-[1.6] text-white/65">
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
