import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";
import { GLASS_DARK } from "@/components/app/glass";
import { cn } from "@/lib/utils";

/** Empty library: a dark liquid-glass invitation, same surface family as every
 *  other element (no image of its own). The white CTA stays the brightest
 *  thing — the one primary action, matching the dashboard record tile. */
export function EmptyRecordings() {
  return (
    <div className="grid place-items-center">
      <div
        className={cn(
          GLASS_DARK,
          "max-w-md rounded-3xl px-7 py-10 text-center sm:px-10"
        )}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-[#0d0d0d]">
          <Mic className="size-5" />
        </span>
        <h2 className="mt-5 text-2xl font-normal tracking-tight text-white">
          Your library is{" "}
          <span className="font-instrument italic">empty, for now</span>
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/65 text-pretty">
          Record your first lecture and Atlas will turn it into thorough,
          structured notes that land right here.
        </p>
        <Link
          href="/upload"
          className="group mx-auto mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-[#0d0d0d] outline-none transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.6)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/50 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          Record your first lecture
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
        </Link>
      </div>
    </div>
  );
}
