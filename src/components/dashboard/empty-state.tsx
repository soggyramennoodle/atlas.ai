import Link from "next/link";
import { Mic } from "lucide-react";
import { GlassPanel, HeroBand } from "@/components/app/glass";
import { ARROW_BADGE, PILL_PRIMARY } from "@/components/app/pills";

/** Empty library: a frosted glass invitation floating on the mist imagery. */
export function EmptyRecordings() {
  return (
    <HeroBand priority className="grid place-items-center px-6 py-14">
      <GlassPanel
        variant="light"
        className="max-w-md px-7 py-9 text-center sm:px-10"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#0d0d0d] text-white">
          <Mic className="size-5" />
        </span>
        <h2 className="mt-5 text-2xl font-normal tracking-tight">
          Your library is{" "}
          <span className="font-instrument italic">empty, for now</span>
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#0d0d0d]/60 text-pretty">
          Record your first lecture and Atlas will turn it into thorough,
          structured notes that land right here.
        </p>
        <Link href="/upload" className={`${PILL_PRIMARY} mt-6 px-6`}>
          Record your first lecture
          {ARROW_BADGE}
        </Link>
      </GlassPanel>
    </HeroBand>
  );
}
