"use client";

import { cn } from "@/lib/utils";

/**
 * An endless strip of Canadian university logos, mirroring the SubjectsMarquee
 * mechanism (one compositor-only translate of a duplicated track). Logos stay
 * muted at rest but preserve crest detail, then reveal their true colour on
 * hover. The strip never pauses on hover.
 */

const LOGO_SIZE_CLASS = {
  base: "h-12 sm:h-[3.75rem]",
  tall: "h-14 sm:h-[4.5rem]",
  focus: "h-16 sm:h-20",
} as const;

type LogoSize = keyof typeof LOGO_SIZE_CLASS;

const UNIVERSITIES = [
  { src: "/universities/toronto.png", name: "University of Toronto" },
  { src: "/universities/waterloo.png", name: "University of Waterloo", size: "focus" },
  { src: "/universities/mcgill.png", name: "McGill University" },
  { src: "/universities/ubc.png", name: "University of British Columbia" },
  { src: "/universities/queens.png", name: "Queen's University" },
  { src: "/universities/western.png", name: "Western University" },
  { src: "/universities/mcmaster.png", name: "McMaster University", size: "focus" },
  { src: "/universities/alberta.png", name: "University of Alberta" },
  { src: "/universities/york.png", name: "York University" },
  { src: "/universities/toronto-metropolitan.png", name: "Toronto Metropolitan University", size: "focus" },
  { src: "/universities/calgary.png", name: "University of Calgary" },
  { src: "/universities/victoria.png", name: "University of Victoria", size: "tall" },
  { src: "/universities/new-brunswick.png", name: "University of New Brunswick", size: "tall" },
  { src: "/universities/manitoba.png", name: "University of Manitoba", size: "tall" },
  { src: "/universities/saskatchewan.png", name: "University of Saskatchewan" },
] satisfies Array<{
  src: string;
  name: string;
  size?: LogoSize;
}>;

export function UniversitiesMarquee() {
  return (
    <section
      aria-label="Universities students bring Atlas to"
      className="relative overflow-hidden border-b border-border py-8"
    >
      <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        For students across Canada
      </p>
      <div className="marquee-mask flex w-max animate-marquee-reverse will-change-transform">
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1}
            className="flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16"
          >
            {UNIVERSITIES.map((u) => (
              <li
                key={`${track}-${u.name}`}
                className="flex h-20 shrink-0 items-center justify-center sm:h-24"
              >
                {/* Plain img: a decorative, duplicated logo strip — next/image's
                    intrinsic-sizing adds friction here for no benefit. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.src}
                  alt={u.name}
                  loading="lazy"
                  className={cn(
                    "uni-logo w-auto max-w-none object-contain",
                    LOGO_SIZE_CLASS[u.size ?? "base"],
                  )}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
