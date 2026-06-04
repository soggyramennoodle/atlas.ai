import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";

export function QuickRecord() {
  return (
    <Link
      href="/upload"
      className="group relative block overflow-hidden rounded-[1.75rem] border border-primary/30 bg-gradient-to-br from-primary/[0.12] via-card to-card p-7 ring-luxe transition hover:border-primary/50"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />
      <div className="relative flex items-center gap-5">
        {/* pulsing record button */}
        <span className="relative grid size-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground animate-pulse-ring">
          <Mic className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
            Quick action
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            Start recording a lecture
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture audio in your browser — notes are ready when it ends.
          </p>
        </div>
        <ArrowRight className="ml-auto hidden size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1 sm:block" />
      </div>
    </Link>
  );
}
