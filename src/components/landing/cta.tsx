import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { AiGlow } from "@/components/ui/ai-glow";

export function FinalCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="mx-auto mt-20 max-w-[1200px] px-4 pb-20 sm:px-6 md:mt-28">
      <Reveal className="relative isolate overflow-hidden rounded-[4px] border border-border bg-card px-6 py-20 text-center sm:px-10 sm:py-24">
        {/* The one colourful moment: a soft, contained AI glow behind the type. */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_45%,black,transparent)]">
          <AiGlow density="lean" blur={80} />
        </div>

        <h2 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.0] tracking-[-0.03em] sm:text-6xl">
          Stop scribbling.
          <br />
          <span className="text-primary">Start understanding.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
          Record your next lecture and let Atlas take the notes, so you can
          finally be present in class.
        </p>
        <div className="mt-9 flex justify-center">
          <Button asChild size="lg" className="group">
            <Link href={ctaHref}>
              <Mic className="size-4" />
              Record a lecture
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
        <p className="mt-5 font-mono text-xs text-muted-foreground">
          No card required. Your recordings stay private.
        </p>
      </Reveal>
    </section>
  );
}
