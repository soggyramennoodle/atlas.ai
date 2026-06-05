import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";

export function QuickRecord() {
  return (
    <Link
      href="/upload"
      className="group block rounded-[4px] border border-border bg-card p-6 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_28px_-18px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-center gap-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-[4px] bg-primary text-primary-foreground">
          <Mic className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Quick action
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            Start recording a lecture
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture audio in your browser. Notes are ready when it ends.
          </p>
        </div>
        <ArrowRight className="ml-auto hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
      </div>
    </Link>
  );
}
