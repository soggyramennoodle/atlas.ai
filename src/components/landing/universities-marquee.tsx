"use client";

import { cn } from "@/lib/utils";

/**
 * An endless strip of North American university crests, mirroring the
 * SubjectsMarquee mechanism (one compositor-only translate of a duplicated
 * track). Canadian and US schools are deliberately scrambled together rather
 * than grouped by country, and every logo renders at a single uniform height.
 * Logos stay muted at rest but preserve crest colour, then reveal full colour
 * on hover.
 */

// Crest + wordmark lockups, bold heraldic shields, and official seals — all
// sized to one height so the strip reads as a uniform wall of crests. CA and US
// are interleaved (never clustered by country, including across the loop seam).
export const UNIVERSITIES = [
  { src: "/universities/harvard.svg", name: "Harvard University" },
  { src: "/universities/toronto.png", name: "University of Toronto" },
  { src: "/universities/stanford.svg", name: "Stanford University" },
  { src: "/universities/mcgill.png", name: "McGill University" },
  { src: "/universities/waterloo.png", name: "University of Waterloo" },
  { src: "/universities/yale.svg", name: "Yale University" },
  { src: "/universities/ubc.png", name: "University of British Columbia" },
  { src: "/universities/berkeley.svg", name: "University of California, Berkeley" },
  { src: "/universities/western.png", name: "Western University" },
  { src: "/universities/princeton.svg", name: "Princeton University" },
  { src: "/universities/mcmaster.png", name: "McMaster University" },
  { src: "/universities/columbia.svg", name: "Columbia University" },
  { src: "/universities/alberta.png", name: "University of Alberta" },
  { src: "/universities/queens.png", name: "Queen's University" },
  { src: "/universities/cornell.svg", name: "Cornell University" },
  { src: "/universities/york.png", name: "York University" },
  { src: "/universities/notre-dame.svg", name: "University of Notre Dame" },
  { src: "/universities/calgary.png", name: "University of Calgary" },
  { src: "/universities/penn.svg", name: "University of Pennsylvania" },
  { src: "/universities/victoria.png", name: "University of Victoria" },
  { src: "/universities/chicago.png", name: "University of Chicago" },
  { src: "/universities/new-brunswick.png", name: "University of New Brunswick" },
  { src: "/universities/johns-hopkins.svg", name: "Johns Hopkins University" },
  { src: "/universities/manitoba.png", name: "University of Manitoba" },
  { src: "/universities/brown.svg", name: "Brown University" },
  { src: "/universities/saskatchewan.png", name: "University of Saskatchewan" },
  { src: "/universities/toronto-metropolitan.png", name: "Toronto Metropolitan University" },
] satisfies Array<{
  src: string;
  name: string;
}>;

export function UniversitiesMarquee() {
  return (
    <section
      aria-label="Universities students bring Atlas to"
      className="relative overflow-hidden border-b border-border py-8"
    >
      <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        For students across North America
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
                    // One uniform height for every crest, CA and US alike.
                    "h-14 sm:h-16",
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
