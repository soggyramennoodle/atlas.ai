"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UNIVERSITIES } from "@/components/landing/universities-marquee";

const PANEL_IMAGE = "/app/meadow-scene.jpg";

/* Split the crest set into three interleaved rows so each marquee carries a
   distinct, non-repeating run of schools. */
const ROWS = [
  UNIVERSITIES.filter((_, i) => i % 3 === 0),
  UNIVERSITIES.filter((_, i) => i % 3 === 1),
  UNIVERSITIES.filter((_, i) => i % 3 === 2),
] as const;

/**
 * A single endless crest row: the landing marquee mechanism (one duplicated,
 * compositor-only track) at panel scale, with each crest set in a frosted
 * glass chip so the colour logos stay legible over the dark photo.
 */
function CrestRow({
  crests,
  reverse,
  paused,
  compact = false,
}: {
  crests: typeof UNIVERSITIES;
  reverse?: boolean;
  paused?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "marquee-mask flex w-max will-change-transform",
        !paused && (reverse ? "animate-marquee-reverse" : "animate-marquee"),
      )}
    >
      {[0, 1].map((track) => (
        <ul
          key={track}
          aria-hidden={track === 1}
          className={cn(
            "flex shrink-0 items-center",
            compact ? "gap-2.5 pr-2.5" : "gap-3 pr-3",
          )}
        >
          {crests.map((u) => (
            <li
              key={`${track}-${u.name}`}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl",
                compact ? "h-12 px-3.5" : "h-16 px-5",
              )}
              style={{
                // Frosted liquid glass, not a flat white card: translucent
                // fill + blur/saturate so it refracts the meadow behind it
                // while keeping colour crests legible.
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(255,255,255,0.6)",
                backdropFilter: "blur(14px) saturate(1.4)",
                WebkitBackdropFilter: "blur(14px) saturate(1.4)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 26px -14px rgba(0,0,0,0.5)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.src}
                alt={u.name}
                loading="lazy"
                className={cn(
                  "w-auto max-w-none object-contain",
                  compact ? "h-7" : "h-9",
                )}
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/**
 * The auth stage's cinematic media panel: the lecture-hall photo + soft-light
 * green tint, now carrying a wall of university crests in glass chips instead
 * of the old rotating brand-text slides. Desktop stacks three drifting marquee
 * rows under a static headline; `compact` is the mobile banner — a single row.
 */
export function AuthStoryPanel({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div
      className={
        compact
          ? "relative h-44 w-full overflow-hidden rounded-[20px] bg-[#1a1a1a]"
          : "relative h-full min-h-[520px] w-full overflow-hidden rounded-[24px] bg-[#1a1a1a]"
      }
      style={{
        boxShadow:
          "0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PANEL_IMAGE}
        alt="A quiet dawn meadow"
        className="absolute inset-0 h-full w-full object-cover [filter:contrast(1.08)_saturate(1.12)]"
        style={{ objectPosition: "center 35%" }}
      />

      {/* Dark veil — the app/dash dawn-meadow treatment, so the frosted glass
          chips cohere instead of fighting a bright scene. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgba(10,12,16,0.46)" }}
      />
      {/* Lower dark gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: compact ? "75%" : "55%",
          background:
            "linear-gradient(0deg, #040504 20.54%, rgba(29,37,9,0) 100%)",
        }}
      />

      {compact ? (
        <>
          {/* Single crest row centred in the banner */}
          <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-[calc(50%+10px)]">
            <CrestRow crests={UNIVERSITIES} reverse paused={reduce} compact />
          </div>
          <h3
            className="font-heading absolute inset-x-0 bottom-3.5 z-10 px-5 text-center text-white"
            style={{
              fontSize: 14,
              letterSpacing: -0.2,
              margin: 0,
              textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            }}
          >
            Trusted by students{" "}
            <span className="font-instrument italic">across North America</span>
          </h3>
        </>
      ) : (
        <>
          {/* Three drifting crest rows, vertically centred in the panel */}
          <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-[calc(50%+34px)] flex-col gap-3.5">
            {ROWS.map((crests, i) => (
              <CrestRow
                key={i}
                crests={crests}
                reverse={i % 2 === 1}
                paused={reduce}
              />
            ))}
          </div>

          {/* Static headline */}
          <h3
            className="absolute z-10 text-white"
            style={{
              left: 24,
              right: 24,
              bottom: 32,
              fontSize: 32,
              lineHeight: "34px",
              letterSpacing: -0.5,
              margin: 0,
              textShadow: "0 2px 18px rgba(0,0,0,0.35)",
            }}
          >
            <span className="font-heading font-semibold">
              Trusted by students
            </span>{" "}
            <span className="font-instrument font-normal italic">
              across North America
            </span>
          </h3>
        </>
      )}
    </div>
  );
}
