import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

export function FinalCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="overflow-hidden bg-[#fafafa] px-6 pb-24 pt-10">
      <Reveal className="mx-auto max-w-[1200px] text-center">
        <p className="font-heading mb-4 text-[12px] font-medium tracking-[2px] text-black/45">
          GET STARTED
        </p>
        <h2 className="m-0 text-balance text-[#0d0d0d]">
          <span
            className="font-heading block font-normal leading-none tracking-[-1.02px]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
          >
            Stop scribbling.
          </span>
          <span
            className="font-instrument block italic font-normal leading-none tracking-[-1.02px]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 72px)" }}
          >
            Start understanding.
          </span>
        </h2>
        <p className="font-heading mx-auto mt-5 max-w-md text-pretty text-[16px] leading-[1.6] text-black/60">
          Record your next lecture and let Atlas take the notes, so you can
          finally be present in class.
        </p>
        <div className="mt-9 flex justify-center">
          <Link
            href={ctaHref}
            className="font-heading flex items-center gap-2 rounded-full bg-[#0d0d0d] py-1.5 pl-6 pr-2 text-[15px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start for free
            <span className="grid size-6 place-items-center rounded-full bg-white">
              <ArrowUpRight size={14} color="#000" strokeWidth={2.5} />
            </span>
          </Link>
        </div>
        <p className="font-heading mt-5 text-[12px] text-black/45">
          No card required. Your recordings stay private.
        </p>
      </Reveal>
    </section>
  );
}
