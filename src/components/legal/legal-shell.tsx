import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

export interface LegalSection {
  heading: string;
  body: string[];
}

/** Renders a title with its last word as the Instrument Serif italic accent. */
function AccentTitle({ title }: { title: string }) {
  const words = title.trim().split(" ");
  const last = words.pop();
  return (
    <h1 className="text-balance text-[#0d0d0d]">
      <span
        className="font-heading font-normal leading-[1.02] tracking-[-1.02px]"
        style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
      >
        {words.join(" ")}{" "}
      </span>
      <span
        className="font-instrument italic font-normal leading-[1.02] tracking-[-1.02px]"
        style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
      >
        {last}
      </span>
    </h1>
  );
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
    <main className="font-heading relative px-4 pb-24 pt-28 lg:pt-32">
      <article className="relative mx-auto max-w-2xl">
        <Reveal>
          <Link
            href="/"
            className="font-heading inline-flex items-center gap-1.5 text-[13px] text-black/60 transition-colors hover:text-[#0d0d0d]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <p className="mt-8">
            <span className="font-heading inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-[1.5px] text-black/60">
              <FileText className="size-3.5" />
              LEGAL
            </span>
          </p>
          <div className="mt-5">
            <AccentTitle title={title} />
          </div>
          <p className="mt-3 text-[13px] text-black/45">Last updated {updated}</p>

          <p className="mt-8 text-pretty text-[15px] leading-[1.6] text-black/60">
            {intro}
          </p>
        </Reveal>

        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <Reveal key={i} delay={Math.min(i, 3) * 0.05}>
              <section>
                <h2 className="flex items-baseline gap-3 text-[22px] font-medium tracking-[-0.5px] text-[#0d0d0d]">
                  <span className="font-instrument italic text-[18px] font-normal text-black/40">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  {s.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((p, j) => (
                    <p
                      key={j}
                      className="text-pretty text-[15px] leading-[1.7] text-black/60"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-12 rounded-[20px] border border-black/[0.08] bg-white p-5 text-pretty text-[13px] leading-[1.6] text-black/60 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
            This is a template document provided for transparency while Atlas is
            in active development. It will be replaced with a finalized policy
            reviewed by counsel before general availability.
          </p>
        </Reveal>
      </article>
    </main>
  );
}
