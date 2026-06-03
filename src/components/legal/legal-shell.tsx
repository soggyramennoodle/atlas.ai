import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface LegalSection {
  heading: string;
  body: string[];
}

/** Shared presentation for the Privacy Policy and Terms of Use pages (§11). */
export function LegalShell({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="relative px-4 pb-24 pt-16 lg:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-aurora opacity-50" />
      <article className="relative mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Legal
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>

        <p className="mt-8 text-pretty leading-relaxed text-foreground/90">
          {intro}
        </p>

        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight">
                <span className="font-mono text-sm text-muted-foreground">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="text-pretty leading-relaxed text-muted-foreground"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 rounded-2xl border bg-card/50 p-5 text-sm text-muted-foreground text-pretty">
          This is a template document provided for transparency while Atlas is in
          active development. It will be replaced with a finalized policy
          reviewed by counsel before general availability.
        </p>
      </article>
    </main>
  );
}
