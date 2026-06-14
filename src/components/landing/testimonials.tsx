"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/reveal";

type Testimonial = {
  quote: string;
  name: string;
  program: string;
  year: string;
};

// Voice deliberately mixed — some polished and capitalised, some all-lowercase
// and offhand, a couple skeptic-to-convert arcs — so the wall reads as real
// students rather than one copywriter. 18 total, six per row, so each marquee
// track is wider than the viewport and loops with no gap.
const ROW_1: Testimonial[] = [
  {
    quote:
      "Recorded my first lecture half as a joke. Walked out with cleaner notes than I'd taken all term. A little insulting, honestly.",
    name: "Noah K.",
    program: "Computer Science",
    year: "2nd year",
  },
  {
    quote:
      "my orgo prof talks like he's being chased. first time my notes actually kept up with him 😭",
    name: "Ravi P.",
    program: "Chemistry",
    year: "1st year",
  },
  {
    quote:
      "Thought it'd be another AI gimmick. Used it once for a stats lecture and now I record everything.",
    name: "Hana O.",
    program: "Statistics",
    year: "2nd year",
  },
  {
    quote:
      "Skipped a week with the flu and just caught up off the notes. Didn't have to email a single classmate.",
    name: "Omar H.",
    program: "Computer Eng",
    year: "2nd year",
  },
  {
    quote:
      "honestly forgot i even recorded a lecture until i needed it. went back and the notes were just waiting. clutch.",
    name: "Grace L.",
    program: "Sociology",
    year: "1st year",
  },
  {
    quote:
      "Reread a month of lectures the night before the final in about an hour. Used to eat a whole weekend.",
    name: "Mei-ling C.",
    program: "Economics",
    year: "4th year",
  },
];

const ROW_2: Testimonial[] = [
  {
    quote:
      "I'm dyslexic. Having the transcript sit next to the clean notes genuinely changed how I study.",
    name: "Sofia M.",
    program: "Linguistics",
    year: "3rd year",
  },
  {
    quote:
      "the part that sold me is it deletes the audio after. wouldn't have recorded my seminars otherwise.",
    name: "Daniel R.",
    program: "Political Science",
    year: "4th year",
  },
  {
    quote:
      "Caught a whole derivation I slept through in a 9am. No notes, no panic — it was just there.",
    name: "Theo L.",
    program: "Mechanical Eng",
    year: "2nd year",
  },
  {
    quote:
      "i have adhd and most study apps overwhelm me so i bail. this one's quiet enough that i open it. free tier's a bit thin tho.",
    name: "Linh T.",
    program: "Nursing",
    year: "1st year",
  },
  {
    quote:
      "My prof posts nothing online. This is the only record I have of his lectures, full stop.",
    name: "Yuki T.",
    program: "Art History",
    year: "3rd year",
  },
  {
    quote:
      "i used to rewrite my notes just to make them legible. now they come out legible. saved me hours.",
    name: "Carlos M.",
    program: "Kinesiology",
    year: "2nd year",
  },
];

const ROW_3: Testimonial[] = [
  {
    quote:
      "Got through three midterms without paying a cent. Kind of waiting for them to start charging me.",
    name: "Aisha K.",
    program: "Biology",
    year: "3rd year",
  },
  {
    quote:
      "my roommate would not shut up about this thing. first semester i felt ahead instead of catching up. never happens.",
    name: "Tobias W.",
    program: "Civil Eng",
    year: "3rd year",
  },
  {
    quote:
      "five courses, every lecture turned into notes i'll actually reopen. that's the whole pitch and it just works.",
    name: "Fatima A.",
    program: "Health Sci",
    year: "2nd year",
  },
  {
    quote:
      "ngl i started recording lectures just to nap through them. the notes came out better than when i was awake lol",
    name: "Jamal O.",
    program: "Biochemistry",
    year: "3rd year",
  },
  {
    quote:
      "Sat through a guest lecture I barely understood live. The notes made it click two days later.",
    name: "Priya D.",
    program: "Philosophy",
    year: "4th year",
  },
  {
    quote:
      "took me a couple lectures to actually trust it. haven't taken notes by hand since.",
    name: "Ethan B.",
    program: "Finance",
    year: "1st year",
  },
];

const ROWS = [ROW_1, ROW_2, ROW_3];
// A trimmed, voice-varied set for the mobile swipe carousel — 18 dots would be
// unusable on a phone.
const MOBILE = [ROW_1[0], ROW_2[1], ROW_3[0], ROW_1[1], ROW_2[3], ROW_3[2], ROW_1[4]];

const ROW_MARQUEE = [
  "animate-marquee",
  "animate-marquee-reverse",
  "animate-marquee-slow",
] as const;

const smoothEase = [0.22, 1, 0.36, 1] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

// Static surface — no hover lift or accent, per the brief. Fixed footprint so a
// row stays level no matter how long a given quote runs.
function Card({ t }: { t: Testimonial }) {
  return (
    <article className="flex h-[208px] w-[320px] flex-col justify-between rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
      <p className="font-heading text-pretty text-[14px] leading-[1.55] text-black/70">
        {t.quote}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <span className="font-heading grid size-9 shrink-0 place-items-center rounded-full border border-black/10 bg-black/[0.04] text-[12px] font-medium tracking-tight text-[#0d0d0d]">
          {initials(t.name)}
        </span>
        <span className="min-w-0">
          <span className="font-heading block truncate text-[13px] font-medium tracking-tight text-[#0d0d0d]">
            {t.name}
          </span>
          <span className="font-heading block truncate text-[12px] text-black/45">
            {t.program}, {t.year}
          </span>
        </span>
      </div>
    </article>
  );
}

// One endless carousel row. The cards each play a one-time rise-from-below
// fly-in (staggered) once `entered`, settling to their natural transform; the
// row's continuous horizontal drift is a CSS marquee switched on only after the
// fly-in lands (`carouselOn`), so the two motions never fight.
function CarouselRow({
  items,
  rowIndex,
  entered,
  carouselOn,
}: {
  items: Testimonial[];
  rowIndex: number;
  entered: boolean;
  carouselOn: boolean;
}) {
  return (
    <div
      className={cn(
        "marquee-mask flex w-max will-change-transform",
        carouselOn && ROW_MARQUEE[rowIndex],
      )}
    >
      {[0, 1].map((track) => (
        <ul
          key={track}
          aria-hidden={track === 1}
          className="flex shrink-0 items-center gap-4 pr-4"
        >
          {items.map((t, i) => {
            // Stagger across the whole grid so cards arrive one at a time, with
            // a gentle alternating sideways lean + tilt for the curved rise.
            const delay = 0.1 + rowIndex * 0.14 + i * 0.07;
            const lean = i % 2 === 0 ? -26 : 26;
            const tilt = i % 2 === 0 ? -3.5 : 3.5;
            const hidden = {
              opacity: 0,
              y: 120,
              x: lean,
              scale: 0.9,
              rotate: tilt,
            };
            const shown = { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 };
            return (
              <li key={`${track}-${t.name}`}>
                <motion.div
                  initial={hidden}
                  animate={entered ? shown : hidden}
                  transition={{ duration: 0.8, delay, ease: smoothEase }}
                >
                  <Card t={t} />
                </motion.div>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

function Heading() {
  return (
    <div className="text-center">
      <p className="font-heading mb-3 text-[12px] font-medium tracking-[2px] text-black/45">
        WHAT STUDENTS SAY
      </p>
      <h2 className="m-0 text-[#0d0d0d]">
        <span
          className="font-heading inline font-normal leading-none tracking-[-1.02px]"
          style={{ fontSize: "clamp(2rem, 5vw, 56px)" }}
        >
          Trusted in{" "}
        </span>
        <span
          className="font-instrument inline italic font-normal leading-none tracking-[-1.02px]"
          style={{ fontSize: "clamp(2rem, 5vw, 56px)" }}
        >
          the lecture hall.
        </span>
      </h2>
    </div>
  );
}

// Card width + gap used for the mobile carousel index math (w-[320px] + gap-4).
const MOBILE_STEP = 320 + 16;

export function Testimonials() {
  const reduce = useReducedMotion() ?? false;

  // ── Desktop pinned cinematic entrance ─────────────────────────────────────
  const stageRef = useRef<HTMLDivElement>(null);
  // Fire once the pinned stage settles near the centre of the viewport.
  const entered = useInView(stageRef, {
    once: true,
    margin: "-25% 0px -25% 0px",
  });
  // The horizontal drift only switches on after the fly-in has landed.
  const [carouselOn, setCarouselOn] = useState(false);
  useEffect(() => {
    if (!entered) return;
    const id = window.setTimeout(() => setCarouselOn(true), 1500);
    return () => window.clearTimeout(id);
  }, [entered]);

  // ── Mobile swipe carousel ─────────────────────────────────────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hasSwiped, setHasSwiped] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const index = Math.round(e.currentTarget.scrollLeft / MOBILE_STEP);
    if (index !== active) setActive(index);
    if (!hasSwiped) setHasSwiped(true);
  }

  function scrollTo(index: number) {
    trackRef.current?.scrollTo({ left: index * MOBILE_STEP, behavior: "smooth" });
  }

  return (
    <>
      {/* Desktop. Reduced motion collapses to a plain stacked section. */}
      {reduce ? (
        <section className="hidden overflow-hidden bg-[#fafafa] px-6 py-20 lg:block">
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-12 text-center">
              <Heading />
            </Reveal>
            <div className="flex flex-col gap-4">
              {ROWS.map((items, i) => (
                <div key={i} className="marquee-mask flex w-max">
                  <ul className="flex shrink-0 items-center gap-4 pr-4">
                    {items.map((t) => (
                      <li key={t.name}>
                        <Card t={t} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section
          className="relative hidden bg-[#fafafa] lg:block"
          style={{ height: "210vh" }}
          aria-label="What students say"
        >
          <div className="sticky top-0 h-screen overflow-hidden">
            <motion.div
              ref={stageRef}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.72 }}
              animate={{ scale: entered ? 1 : 0.72 }}
              transition={{ duration: 1, ease: smoothEase }}
            >
              <div className="relative w-full">
                {/* Heading floats above the rows so its exit causes no layout
                    shift: visible through the fly-in, then lifts away so the
                    cards own the full screen. */}
                <motion.div
                  className="absolute inset-x-0 bottom-full mb-10 flex justify-center"
                  initial={{ opacity: 1, y: 0 }}
                  animate={
                    entered ? { opacity: 0, y: -64 } : { opacity: 1, y: 0 }
                  }
                  transition={{
                    duration: 0.7,
                    delay: entered ? 1.15 : 0,
                    ease: smoothEase,
                  }}
                >
                  <Heading />
                </motion.div>

                <div className="flex w-full flex-col gap-4">
                  {ROWS.map((items, i) => (
                    <CarouselRow
                      key={i}
                      items={items}
                      rowIndex={i}
                      entered={entered}
                      carouselOn={carouselOn}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Mobile / tablet: swipeable carousel with dots + swipe hint */}
      <section className="overflow-hidden bg-[#fafafa] px-6 py-20 lg:hidden">
        <div className="mx-auto max-w-[1200px]">
          <Reveal className="mb-12 text-center">
            <Heading />
          </Reveal>

          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {MOBILE.map((t) => (
              <div key={t.name} className="shrink-0 snap-start">
                <Card t={t} />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              {MOBILE.map((t, i) => (
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
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2} />
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
