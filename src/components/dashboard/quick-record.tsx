import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";

export function QuickRecord() {
  return (
    <Link
      href="/upload"
      className="group flex items-center gap-5 rounded-3xl border border-black/[0.08] bg-white p-6 outline-none transition-[border-color,box-shadow] duration-300 hover:border-black/20 hover:shadow-[0_18px_50px_-32px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#0d0d0d] text-white transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100">
        <Mic className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0d0d0d]/45">
          Quick action
        </p>
        <h2 className="mt-1 text-xl font-normal tracking-tight">
          Start recording a{" "}
          <span className="font-instrument italic">lecture</span>
        </h2>
        <p className="mt-1 text-sm text-[#0d0d0d]/55">
          Capture audio in your browser. Notes are ready when it ends.
        </p>
      </div>
      <ArrowRight className="ml-auto hidden size-5 shrink-0 text-[#0d0d0d]/40 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 sm:block" />
    </Link>
  );
}
