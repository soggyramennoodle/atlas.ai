import Link from "next/link";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { AiGlow } from "@/components/ui/ai-glow";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative px-4 pb-20 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            A note taker, made for you
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-5 max-w-[18ch] text-[clamp(2.75rem,8vw,6rem)] font-bold leading-[0.95] tracking-[-0.03em]">
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

        {/* Real note preview, partly clipped like rivo's product shot. The AI
            summary block carries the living glow + AI ring, so the one piece of
            colour on the page is the signal that Atlas wrote it. */}
        <Reveal delay={0.26} className="mt-16 sm:mt-20">
          <NotePreview />
        </Reveal>
      </div>
    </section>
  );
}

function NotePreview() {
  return (
    <div className="relative mx-auto max-w-[920px]">
      <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        {/* Note header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
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
          {/* AI summary - the AI-powered surface, with the ring + glow. */}
          <div className="ai-ring relative overflow-hidden rounded-[6px] bg-card p-5">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <AiGlow mode="idle" density="lean" blur={52} />
            </div>
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
