"use client";

/**
 * One endless kinetic strip of subjects, communicating "Atlas works for any
 * lecture." A single compositor-only translate of a duplicated track, restyled
 * for the cinematic black canvas: muted white type, hairline dot separators.
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
      className="relative overflow-hidden border-y border-white/10 bg-[#000] py-6"
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
                <span className="font-heading px-7 text-xl font-normal tracking-tight text-white/55 sm:text-2xl">
                  {s}
                </span>
                <span aria-hidden className="size-1 rounded-full bg-white/20" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
