"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
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
// students rather than one copywriter. Split into three rows of four below.
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
      "ngl i started recording lectures just to nap through them. the notes came out better than when i was awake lol",
    name: "Jamal O.",
    program: "Biochemistry",
    year: "3rd year",
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
      "Reread a month of lectures the night before the final in about an hour. Used to eat a whole weekend.",
    name: "Mei-ling C.",
    program: "Economics",
    year: "4th year",
  },
  {
    quote:
      "five courses, every lecture turned into notes i'll actually reopen. that's the whole pitch and it just works.",
    name: "Fatima A.",
    program: "Health Sci",
    year: "2nd year",
  },
];

const ALL = [...ROW_1, ...ROW_2, ...ROW_3];

// Per-row entrance geometry. Cards swoop down from above along an inverted (∩)
// arc — the middle row starts highest, the outer rows sway in from the sides —
// then settle flat into the three-row grid before the carousel takes over.
const ROW_ENTRY = [
  { y: -300, x: -150, rotate: -7 },
  { y: -420, x: 0, rotate: 0 },
  { y: -300, x: 150, rotate: 7 },
] as const;

const ROW_MARQUEE = [
  "animate-marquee",
  "animate-marquee-reverse",
  "animate-marquee-slow",
] as const;

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
    <article className="flex h-[200px] w-[316px] shrink-0 flex-col justify-between rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
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

// One endless carousel row: the landing marquee mechanism (one duplicated,
// compositor-only track). Wrapped in a motion layer whose transform is scrubbed
// by the section's scroll progress, so the arc fly-in composes cleanly on top
// of the continuous horizontal drift.
function CarouselRow({
  items,
  rowIndex,
  progress,
  reduce,
}: {
  items: Testimonial[];
  rowIndex: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const entry = ROW_ENTRY[rowIndex];
  // Staggered entrance window: each row lands a touch after the one before it,
  // all completing within the first ~quarter of the pinned scrub.
  const start = 0.02 + rowIndex * 0.05;
  const end = start + 0.2;

  const opacity = useTransform(progress, [start, start + 0.05], [0, 1]);
  const y = useTransform(progress, [start, end], [entry.y, 0]);
  const x = useTransform(progress, [start, end], [entry.x, 0]);
  const rotate = useTransform(progress, [start, end], [entry.rotate, 0]);

  return (
    <motion.div style={reduce ? undefined : { opacity, y, x, rotate }}>
      <div
        className={cn(
          "marquee-mask flex w-max will-change-transform",
          !reduce && ROW_MARQUEE[rowIndex],
        )}
      >
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1}
            className="flex shrink-0 items-center gap-4 pr-4"
          >
            {items.map((t) => (
              <li key={`${track}-${t.name}`}>
                <Card t={t} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </motion.div>
  );
}

const ROWS = [ROW_1, ROW_2, ROW_3];

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

// Card width + gap used for the mobile carousel index math (w-[300px] + gap-4).
const MOBILE_STEP = 300 + 16;

export function Testimonials() {
  const reduce = useReducedMotion() ?? false;

  // ── Desktop pinned scroll-scrub ──────────────────────────────────────────
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end end"],
  });

  // Zoom: the rows start inset (a contained section with #fafafa margins) then
  // scale up to fill the viewport while pinned, then zoom back out on exit —
  // the neighbouring sections appear to pull out of frame and back.
  const stageScale = useTransform(
    scrollYProgress,
    [0, 0.22, 0.74, 1],
    [0.6, 1, 1, 0.6],
  );
  // Heading recedes while the cards own the screen, returns as we zoom out.
  const headingOpacity = useTransform(
    scrollYProgress,
    [0, 0.22, 0.74, 1],
    [1, 0.2, 0.2, 1],
  );

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
      {/* Desktop: pinned zoom-in, arc fly-in, then endless three-row carousel.
          Under reduced motion this collapses to a plain stacked section below. */}
      {reduce ? (
        <section className="hidden overflow-hidden bg-[#fafafa] px-6 py-20 lg:block">
          <div className="mx-auto max-w-[1200px]">
            <Reveal className="mb-12 text-center">
              <Heading />
            </Reveal>
            <div className="flex flex-col gap-4">
              {ROWS.map((items, i) => (
                <CarouselRow
                  key={i}
                  items={items}
                  rowIndex={i}
                  progress={scrollYProgress}
                  reduce
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section
          ref={stageRef}
          className="relative hidden bg-[#fafafa] lg:block"
          style={{ height: "260vh" }}
          aria-label="What students say"
        >
          <div className="sticky top-0 flex h-screen items-center overflow-hidden">
            <motion.div
              style={{ scale: stageScale }}
              className="flex w-full flex-col items-center gap-8"
            >
              <motion.div style={{ opacity: headingOpacity }}>
                <Heading />
              </motion.div>
              <div className="flex w-full flex-col gap-4">
                {ROWS.map((items, i) => (
                  <CarouselRow
                    key={i}
                    items={items}
                    rowIndex={i}
                    progress={scrollYProgress}
                    reduce={false}
                  />
                ))}
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
            {ALL.map((t) => (
              <div key={t.name} className="shrink-0 snap-start">
                <Card t={t} />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              {ALL.map((t, i) => (
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
