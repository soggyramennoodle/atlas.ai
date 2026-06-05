"use client";

/**
 * One endless kinetic strip of subjects, communicating "Atlas works for any
 * lecture." A single compositor-only translate of a duplicated track. Neutral
 * and quiet to match the rivo language: muted type, hairline dot separators, no
 * pop colours.
 */

const SUBJECTS = [
  "Organic Chemistry",
  "Constitutional Law",
  "Microeconomics",
  "Cell Biology",
  "Linear Algebra",
  "Neuroscience",
  "Art History",
  "Thermodynamics",
  "Macroeconomics",
  "Anatomy",
  "Political Theory",
  "Calculus",
];

export function SubjectsMarquee() {
  return (
    <section
      aria-label="Subjects Atlas works with"
      className="relative overflow-hidden border-y border-border py-6"
    >
      <div className="marquee-mask flex w-max animate-marquee will-change-transform">
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1}
            className="flex shrink-0 items-center"
          >
            {SUBJECTS.map((s) => (
              <li key={`${track}-${s}`} className="flex items-center">
                <span className="px-7 text-xl font-medium tracking-tight text-muted-foreground sm:text-2xl">
                  {s}
                </span>
                <span
                  aria-hidden
                  className="size-1 rounded-full bg-border"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
