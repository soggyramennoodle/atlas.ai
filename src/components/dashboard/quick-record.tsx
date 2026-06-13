import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";
import { GLASS_DARK, GLASS_HOVER } from "@/components/app/glass";
import { cn } from "@/lib/utils";

/**
 * The library's "new recording" tile — the single quick-action entry point
 * (§10). Lives inside the recordings grid so starting the next lecture is the
 * natural last card of the library.
 * TODO: Dynamic quick actions based on AI context (flashcard review, quiz
 * practice, note review)
 */
export function QuickRecord() {
  return (
    <Link
      href="/upload"
      className={cn(
        GLASS_DARK,
        GLASS_HOVER,
        "group flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-3xl border-dashed border-white/30 p-5 text-center outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0"
      )}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#0d0d0d] transition-transform duration-300 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100">
        <Mic className="size-5" />
      </span>
      <div>
        <p className="text-base font-medium tracking-tight text-white">
          Record a <span className="font-instrument italic">lecture</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/65">
          Notes are ready when it ends
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
        </p>
      </div>
    </Link>
  );
}
