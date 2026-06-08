import Link from "next/link";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    // overflow-x-clip (desktop only) lets the product shot bleed off the right
    // edge as an intentional peek without ever creating a horizontal scrollbar.
    <section className="relative flex min-h-[calc(100svh-5.75rem)] px-4 pb-24 pt-8 sm:px-6 sm:pb-28 sm:pt-10 lg:min-h-[calc(100svh-11rem)] lg:pb-4 lg:pt-4 lg:overflow-x-clip">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-8">
        {/* Copy — held to the left of an asymmetric split. */}
        <div className="lg:col-span-5">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              A note taker, made for you
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-5 text-balance text-[clamp(2.75rem,8vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em] lg:text-[clamp(3rem,5vw,4.75rem)]">
              Sit back
              <br />
              <span className="text-primary">and listen.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              Record any lecture in your browser and Atlas hands back thorough,
              structured notes. We remember every word.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="group">
                <Link href={ctaHref}>
                  <Mic className="size-4" />
                  Record a lecture
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="group">
                <Link href="/#how">
                  See how it works
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Product shot fills the right of the first viewport. On desktop it is
            oversized, nudged down/right and clipped past the edge; the AI summary
            keeps the single living glow that signals "Atlas wrote this". */}
        <div className="relative lg:col-span-7">
          <Reveal delay={0.26}>
            {/* Inner wrapper owns the desktop oversize/offset so it never fights
                Reveal's animated transform on the parent. */}
            <div className="relative mx-auto w-full max-w-[920px] lg:mx-0 lg:w-[116%] lg:max-w-none lg:translate-x-[4%] lg:translate-y-6">
              <NotePreview />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function NotePreview() {
  return (
    <div className="relative w-full">
      {/* Live capture chip — the input that becomes the note below. Overlaps the
          card's top edge so it reads as product context, not decoration. */}
      <div className="absolute -top-3 left-4 z-10 inline-flex items-center gap-2.5 rounded-[5px] border border-border bg-card/95 px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_30px_-14px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:left-6">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#e5484d] opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-[#e5484d]" />
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/70">
          Recording
        </span>
        <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-foreground/35 [animation:atlas-wave_1.1s_ease-in-out_infinite]"
              style={{
                height: "100%",
                transformOrigin: "bottom",
                animationDelay: `${i * 0.13}s`,
              }}
            />
          ))}
        </span>
        <span className="font-mono text-[10.5px] tabular-nums tracking-tight text-muted-foreground">
          47:32
        </span>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        {/* Note header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 pt-6 sm:px-7">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Biology 1A03 · Lecture 12
            </p>
            <h2 className="mt-1 truncate text-[17px] font-semibold tracking-tight sm:text-[19px]">
              Photosynthesis and the light reactions
            </h2>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-[4px] border border-border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
            48 min
          </span>
        </div>

        <div className="grid gap-5 px-5 py-6 sm:grid-cols-[1.6fr_1fr] sm:px-7 sm:py-7">
          {/* AI summary - the AI-powered surface, signed by the fluid edge glow. */}
          <div className="ai-ring relative rounded-[6px] bg-card p-5">
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
                <Sparkles className="size-3.5" />
                Summary
              </span>
              <p className="mt-3 text-[14px] leading-[1.65] text-foreground/85">
                The lecture covered how chloroplasts convert light into chemical
                energy: the light-dependent reactions in the thylakoid membrane,
                the role of photosystems II and I, and how the proton gradient
                drives ATP synthase.
              </p>
            </div>
          </div>

          {/* Plain, non-AI note body - no glow here. */}
          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-semibold tracking-tight">
                Key concepts
              </h3>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <li>Thylakoid and stroma</li>
                <li>Photosystem II to I electron flow</li>
                <li>Chemiosmosis and ATP synthase</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Light reactions", "NADPH", "Calvin cycle"].map((t) => (
                <span
                  key={t}
                  className="rounded-[4px] border border-border px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Fade the bottom so the card reads as a peek into the product. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
