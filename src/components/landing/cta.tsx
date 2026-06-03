import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

export function FinalCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <Reveal className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-primary px-6 py-20 text-center text-primary-foreground sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.14]" />
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-black/20 blur-3xl animate-float" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop scribbling. Start{" "}
            <span className="font-serif font-normal italic">understanding.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
            Record your next lecture and let Atlas take the notes for you.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="group shimmer mt-9 h-12 px-6 text-base"
          >
            <Link href={ctaHref}>
              <Mic className="size-4" />
              Get started free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
