"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/landing/reveal";

type Testimonial = {
  quote: string;
  name: string;
  program: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I stopped trying to write and listen at the same time. After class the whole lecture was just there, cleaned up into notes I'd actually reread.",
    name: "Priya Nadkarni",
    program: "2nd-year Neuroscience",
  },
  {
    quote:
      "My orgo prof talks insanely fast. First time I've had notes that kept up with him.",
    name: "Marcus Bell",
    program: "Chemistry",
  },
  {
    quote:
      "Thought it'd be another AI gimmick. Used it for one stats lecture and now I record everything.",
    name: "Hana Okafor",
    program: "Economics",
  },
  {
    quote:
      "The fact that it deletes the audio afterward is the only reason I was okay recording my seminars.",
    name: "Daniel Roth",
    program: "Political Science",
  },
  {
    quote:
      "I'm dyslexic, and reading the transcript next to the clean notes genuinely changed how I study.",
    name: "Sofia Mendes",
    program: "Psychology",
  },
  {
    quote:
      "Caught an entire derivation I slept through. No notes, no problem.",
    name: "Theo Lindqvist",
    program: "Mechanical Engineering",
  },
  {
    quote:
      "Got through midterms in three courses and didn't pay a cent. Kind of waiting for them to start charging me.",
    name: "Aisha Karim",
    program: "Health Sciences",
  },
];

// Upside-down-U arc slots, center (index 3) at the peak. x/y are offsets in px
// from the stage center; rotate fans the cards outward; scale + z keep the
// middle card most prominent.
const ARC = [
  { x: -600, y: 74, rotate: -11, scale: 0.9, z: 1 },
  { x: -400, y: 30, rotate: -7, scale: 0.94, z: 2 },
  { x: -200, y: 6, rotate: -3, scale: 0.97, z: 3 },
  { x: 0, y: -6, rotate: 0, scale: 1.04, z: 7 },
  { x: 200, y: 6, rotate: 3, scale: 0.97, z: 3 },
  { x: 400, y: 30, rotate: 7, scale: 0.94, z: 2 },
  { x: 600, y: 74, rotate: 11, scale: 0.9, z: 1 },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function Card({ t }: { t: Testimonial }) {
  return (
    <>
      <p className="font-heading text-pretty text-[14px] leading-[1.6] text-black/70">
        {t.quote}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="font-heading grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-black/[0.04] text-[12px] font-medium tracking-tight text-[#0d0d0d]">
          {initials(t.name)}
        </span>
        <span className="min-w-0">
          <span className="font-heading block truncate text-[13px] font-medium tracking-tight text-[#0d0d0d]">
            {t.name}
          </span>
          <span className="font-heading block truncate text-[12px] text-black/45">
            {t.program}
          </span>
        </span>
      </div>
    </>
  );
}

export function Testimonials() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="overflow-hidden bg-[#fafafa] px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mb-14 text-center lg:mb-20">
          <p className="font-heading mb-4 text-[12px] font-medium tracking-[2px] text-black/45">
            WHAT STUDENTS SAY
          </p>
          <h2 className="m-0 text-[#0d0d0d]">
            <span
              className="font-heading block font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              Trusted in
            </span>
            <span
              className="font-instrument block italic font-normal leading-none tracking-[-1.02px]"
              style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
            >
              the lecture hall.
            </span>
          </h2>
        </Reveal>

        {/* Desktop: fan-in arc */}
        <div className="relative hidden h-[460px] lg:block">
          <div className="absolute left-1/2 top-1/2 size-px -translate-x-1/2 -translate-y-1/2">
            {TESTIMONIALS.map((t, i) => {
              const slot = ARC[i];
              const isHovered = hovered === i;
              // Stagger from the centre outward so the fan opens from the middle.
              const delay = 0.15 + Math.abs(i - 3) * 0.1;
              return (
                <motion.article
                  key={t.name}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="absolute left-0 top-0 flex h-[230px] w-[280px] -translate-x-1/2 -translate-y-1/2 cursor-default flex-col justify-between rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
                  style={{ zIndex: isHovered ? 30 : slot.z }}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          x: 0,
                          y: 150,
                          rotate: 0,
                          scale: 0.6,
                        }
                  }
                  whileInView={
                    reduce
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          x: slot.x,
                          y: slot.y,
                          rotate: slot.rotate,
                          scale: slot.scale,
                        }
                  }
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{ duration: 0.85, delay, ease: smoothEase }}
                  whileHover={
                    reduce
                      ? undefined
                      : {
                          rotate: 0,
                          scale: 1.08,
                          y: slot.y - 24,
                          transition: { duration: 0.3, ease: smoothEase },
                        }
                  }
                >
                  <Card t={t} />
                </motion.article>
              );
            })}
          </div>
        </div>

        {/* Mobile / tablet: swipeable row */}
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TESTIMONIALS.map((t, i) => (
            <Reveal
              key={t.name}
              delay={i * 0.06}
              className="snap-center shrink-0"
            >
              <article className="flex h-[230px] w-[280px] flex-col justify-between rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
                <Card t={t} />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
