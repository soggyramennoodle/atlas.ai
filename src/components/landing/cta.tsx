import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

export function FinalCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 pb-16">
      <Reveal className="relative isolate overflow-hidden rounded-[2.5rem] border border-primary/20 bg-card/40 px-6 py-24 text-center ring-luxe sm:px-10 sm:py-28">
        {/* Layered background treatment — drifting aurora + grid + glow blobs. */}
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
        <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-chart-4/20 blur-3xl animate-float" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Your next lecture
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Stop scribbling.
            <br />
            <span className="font-display text-6xl font-semibold tracking-tight sm:text-7xl lg:text-[5rem]">
              <span className="text-gradient-brand animate-gradient">
                Start understanding.
              </span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg text-muted-foreground">
            Record your next lecture and let Atlas take the notes — so you can
            finally be present in class.
          </p>
          <Button
            asChild
            size="lg"
            className="group shimmer mt-10 h-12 px-8 text-base"
          >
            <Link href={ctaHref}>
              <Mic className="size-4" />
              Get started free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <p className="mt-5 font-mono text-xs text-muted-foreground">
            No card required · Your recordings stay private
          </p>
        </div>
      </Reveal>
    </section>
  );
}
