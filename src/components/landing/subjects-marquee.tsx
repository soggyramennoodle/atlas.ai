"use client";

/**
 * A single endless kinetic strip of subjects (rivocareers-inspired motion),
 * communicating "Atlas works for any lecture." One compositor-only translate of
 * a duplicated track; the pop accents appear only as small separator dots, the
 * one sanctioned sparing use of the pop palette here.
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

const POPS = [
  "var(--pop-lime)",
  "var(--pop-sky)",
  "var(--pop-amber)",
  "var(--pop-coral)",
  "var(--primary)",
];

export function SubjectsMarquee() {
  return (
    <section
      aria-label="Subjects Atlas works with"
      className="render-section relative overflow-hidden border-y border-border/60 py-7"
    >
      <div className="marquee-mask flex w-max animate-marquee will-change-transform">
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1}
            className="flex shrink-0 items-center"
          >
            {SUBJECTS.map((s, i) => (
              <li key={`${track}-${s}`} className="flex items-center">
                <span className="px-7 font-display text-2xl font-semibold tracking-tight text-foreground/80 sm:text-3xl">
                  {s}
                </span>
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: POPS[i % POPS.length] }}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
