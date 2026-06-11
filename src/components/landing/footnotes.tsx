import { Reveal } from "@/components/landing/reveal";

/**
 * Apple-style footnotes for the landing page. Each forward-looking claim (a
 * feature we show but haven't shipped yet) carries a numbered superscript that
 * links down to the Footnotes section, which links back up. Keep these IDs and
 * numbers in sync with the <FootnoteRef /> markers placed in the sections.
 */
export const FOOTNOTES: { id: string; n: number; body: string }[] = [
  {
    id: "semester",
    n: 1,
    body: "Semester overview and per-subject breakdowns are in active development and not yet available in Atlas.",
  },
  {
    id: "ask",
    n: 2,
    body: "Conversational “Ask Atlas” is in development. Today, Atlas provides inline explanations and key concepts on individual notes rather than a free-form chat across your library.",
  },
  {
    id: "predictive",
    n: 3,
    body: "Exam-readiness scoring and predictive study analytics are illustrative and in active development. Figures shown are examples, not measurements from your account.",
  },
  {
    id: "categorization",
    n: 4,
    body: "Automatic smart categorization is coming soon. For now, notes are organized by the course you assign when you record.",
  },
];

const BY_ID = Object.fromEntries(FOOTNOTES.map((f) => [f.id, f]));

/**
 * The superscript marker placed next to a claim. Renders a small clickable
 * number that scrolls to the matching footnote. Safe to use inside client
 * components — it's plain markup with no hooks.
 */
export function FootnoteRef({ id }: { id: string }) {
  const fn = BY_ID[id];
  if (!fn) return null;
  return (
    <sup
      id={`fnref-${id}`}
      className="font-heading ml-0.5 align-super text-[0.55em] font-medium"
      style={{ lineHeight: 0 }}
    >
      <a
        href={`#fn-${id}`}
        aria-label={`Footnote ${fn.n}`}
        className="text-current no-underline transition-opacity hover:opacity-100"
        style={{ opacity: 0.7 }}
      >
        {fn.n}
      </a>
    </sup>
  );
}

/** The numbered footnotes list, rendered once near the bottom of the page. */
export function LandingFootnotes() {
  return (
    <section
      aria-label="Footnotes"
      className="border-t border-black/10 bg-[#fafafa]"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6">
        <Reveal>
          <p className="font-heading text-[11px] font-medium tracking-[2px] text-black/40">
            FOOTNOTES
          </p>
          <ol className="mt-5 space-y-3">
            {FOOTNOTES.map((f) => (
              <li
                key={f.id}
                id={`fn-${f.id}`}
                className="flex scroll-mt-28 gap-3 text-pretty text-[12.5px] leading-[1.6] text-black/55"
              >
                <span className="font-heading shrink-0 tabular-nums text-black/35">
                  {f.n}.
                </span>
                <span>
                  {f.body}{" "}
                  <a
                    href={`#fnref-${f.id}`}
                    aria-label="Back to reference"
                    className="text-black/35 no-underline transition-colors hover:text-black/70"
                  >
                    ↩
                  </a>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
