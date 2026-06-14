"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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

// Asymmetric ascending curve: cards start low on the left and rise to the
// right along a gentle upward bow. x/y are offsets in px from the stage centre;
// the left/front cards are larger and stack on top (z 7 -> 1) so the run reads
// as receding into the distance toward the upper-right.
const ARC = [
  { x: -540, y: 150, rotate: 4, scale: 1.0, z: 7 },
  { x: -360, y: 96, rotate: 2, scale: 0.96, z: 6 },
  { x: -180, y: 44, rotate: 0, scale: 0.93, z: 5 },
  { x: 0, y: -6, rotate: -2, scale: 0.9, z: 4 },
  { x: 180, y: -52, rotate: -3, scale: 0.87, z: 3 },
  { x: 360, y: -96, rotate: -4, scale: 0.84, z: 2 },
  { x: 540, y: -140, rotate: -5, scale: 0.82, z: 1 },
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function CardBody({ t }: { t: Testimonial }) {
  return (
    <>
      <p className="font-heading text-pretty text-[14px] leading-[1.6] text-black/70">
        {t.quote}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="font-heading grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-black/[0.04] text-[12px] font-medium tracking-tight text-[#0d0d0d] transition-colors duration-300 group-hover:border-[#0a5736]/30 group-hover:bg-[#0a5736]/[0.08] group-hover:text-[#0a5736]">
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

// Card width + gap used for the mobile carousel index math (w-[280px] + gap-4).
const MOBILE_STEP = 280 + 16;

export function Testimonials() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hasSwiped, setHasSwiped] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const index = Math.round(e.currentTarget.scrollLeft / MOBILE_STEP);
    if (index !== active) setActive(index);
    if (!hasSwiped) setHasSwiped(true);
  }

  function scrollTo(index: number) {
    trackRef.current?.scrollTo({
      left: index * MOBILE_STEP,
      behavior: "smooth",
    });
  }

  // The inner card surface — owns the hover lift + emerald focus accent. Kept
  // separate from the entrance layer so the slow reveal transition never
  // bleeds into the snappy hover-out.
  const cardClass =
    "group flex w-[280px] cursor-default flex-col justify-between rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)] transition-[box-shadow,border-color] duration-300 hover:border-[#0a5736]/25 hover:shadow-[0_26px_60px_-12px_rgba(10,87,54,0.35)]";

  return (
    <section className="overflow-hidden bg-[#fafafa] px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mb-14 text-center lg:mb-16">
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

        {/* Desktop: diagonal sweep-in along an ascending curve */}
        <div className="relative hidden h-[540px] lg:block">
          <div className="absolute left-1/2 top-1/2 size-px -translate-x-1/2 -translate-y-1/2">
            {TESTIMONIALS.map((t, i) => {
              const slot = ARC[i];
              const isHovered = hovered === i;
              // Stagger left -> right so the run climbs the curve one card at a time.
              const delay = 0.1 + i * 0.12;
              return (
                <motion.div
                  key={t.name}
                  className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
                  style={{ zIndex: isHovered ? 30 : slot.z }}
                  initial={
                    reduce
                      ? { opacity: 0, x: slot.x, y: slot.y, scale: 1 }
                      : {
                          opacity: 0,
                          x: slot.x - 180,
                          y: slot.y + 200,
                          scale: 0.85,
                        }
                  }
                  whileInView={
                    reduce
                      ? { opacity: 1 }
                      : { opacity: 1, x: slot.x, y: slot.y, scale: 1 }
                  }
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{
                    duration: reduce ? 0.4 : 0.7,
                    delay,
                    ease: smoothEase,
                  }}
                >
                  <motion.article
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className={`${cardClass} h-[230px]`}
                    initial={{ rotate: slot.rotate, scale: slot.scale }}
                    whileHover={
                      reduce
                        ? undefined
                        : { rotate: 0, scale: slot.scale + 0.12, y: -22 }
                    }
                    transition={{ duration: 0.3, ease: smoothEase }}
                  >
                    <CardBody t={t} />
                  </motion.article>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile / tablet: swipeable carousel with dots + swipe hint */}
        <div className="lg:hidden">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className={`${cardClass} h-[210px] shrink-0 snap-start !shadow-[0_8px_30px_rgba(0,0,0,0.05)]`}
              >
                <CardBody t={t} />
              </article>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  aria-label={`Go to testimonial ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active === i ? "w-5 bg-[#0d0d0d]" : "w-1.5 bg-black/20"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence>
              {!hasSwiped && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-heading flex items-center gap-0.5 text-[12px] font-medium text-black/40"
                >
                  Swipe
                  <motion.span
                    aria-hidden
                    animate={reduce ? undefined : { x: [0, 3, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2} />
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
