import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

export default function ArticleNotFound() {
  return (
    <div className="font-heading px-4 pb-24 pt-32">
      <div className="mx-auto max-w-md rounded-[24px] border border-black/[0.08] bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <div className="mx-auto grid size-14 place-items-center rounded-[12px] border border-black/10 bg-white text-[#0d0d0d]">
          <Newspaper className="size-6" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-balance text-[#0d0d0d]">
          <span className="font-heading text-2xl font-normal tracking-[-0.5px]">
            Story not{" "}
          </span>
          <span className="font-instrument text-2xl italic font-normal tracking-[-0.5px]">
            found
          </span>
        </h1>
        <p className="mt-2 text-[13px] leading-[1.6] text-black/60">
          This article may have been moved or unpublished.
        </p>
        <Link
          href="/newsroom"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0d0d0d] px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="size-4" />
          Back to Newsroom
        </Link>
      </div>
    </div>
  );
}
