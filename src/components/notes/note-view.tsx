import type { StructuredNotes } from "@/lib/types";

/**
 * Presentational renderer for a set of structured lecture notes.
 * Mirrors the shape produced by Gemini in lib/gemini.ts.
 */
export function NoteView({ notes }: { notes: StructuredNotes }) {
  return (
    <article className="space-y-10">
      {/* Summary */}
      <section className="rounded-[1.5rem] border bg-primary/[0.04] p-6 sm:p-7">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
          Summary
        </h2>
        <p className="mt-3 text-pretty leading-relaxed text-foreground/90">
          {notes.summary}
        </p>
      </section>

      {/* Detailed sections */}
      <div className="space-y-9">
        {notes.sections.map((section, i) => (
          <section key={i} className="scroll-mt-24">
            <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight">
              <span className="font-mono text-sm text-muted-foreground">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              {section.heading}
            </h2>

            <ul className="mt-4 space-y-2.5">
              {section.points.map((point, j) => (
                <li key={j} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="text-pretty">{point}</span>
                </li>
              ))}
            </ul>

            {section.subsections?.map((sub, k) => (
              <div key={k} className="mt-5 border-l-2 border-border pl-5">
                <h3 className="font-medium tracking-tight">{sub.heading}</h3>
                <ul className="mt-2.5 space-y-2">
                  {sub.points.map((point, j) => (
                    <li
                      key={j}
                      className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                      <span className="text-pretty">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* Key concepts */}
      {notes.keyConcepts.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold tracking-tight">Key concepts</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {notes.keyConcepts.map((concept, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-card p-5"
              >
                <dt className="font-semibold tracking-tight">{concept.term}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {concept.definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  );
}
