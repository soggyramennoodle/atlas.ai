"use client";

/**
 * An endless strip of Canadian university logos, mirroring the SubjectsMarquee
 * mechanism (one compositor-only translate of a duplicated track). Logos render
 * as uniform monochrome silhouettes at rest — colour is reserved for the AI
 * glow elsewhere, so a muted "trusted by" wall keeps the rivo language clean —
 * and reveal their true colour on hover. The strip never pauses on hover.
 */

const UNIVERSITIES = [
  { src: "/universities/toronto-metropolitan.png", name: "Toronto Metropolitan University" },
  { src: "/universities/waterloo.png", name: "University of Waterloo" },
  { src: "/universities/mcgill.png", name: "McGill University" },
  { src: "/universities/alberta.png", name: "University of Alberta" },
  { src: "/universities/calgary.png", name: "University of Calgary" },
  { src: "/universities/victoria.png", name: "University of Victoria" },
  { src: "/universities/manitoba.png", name: "University of Manitoba" },
  { src: "/universities/saskatchewan.png", name: "University of Saskatchewan" },
];

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
            className="flex shrink-0 items-center"
          >
            {UNIVERSITIES.map((u) => (
              <li
                key={`${track}-${u.name}`}
                className="flex h-9 w-[150px] items-center justify-center px-4 sm:w-[180px]"
              >
                {/* Plain img: a decorative, duplicated logo strip — next/image's
                    intrinsic-sizing adds friction here for no benefit. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.src}
                  alt={u.name}
                  loading="lazy"
                  className="uni-logo max-h-8 w-auto max-w-full object-contain sm:max-h-9"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
