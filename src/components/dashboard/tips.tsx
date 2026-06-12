import { Lightbulb } from "lucide-react";
import { CARD } from "@/components/app/glass";
import { cn } from "@/lib/utils";

const TIPS = [
  "Place your device near the lecturer for the cleanest audio.",
  "Long lecture? Atlas handles multi-hour recordings, just let it run.",
  "Review the key concepts first; they're your fastest revision pass.",
  "No mic handy? Upload an existing recording from the record screen.",
];

/** Quiet horizontal strip at the foot of the dashboard. */
export function Tips() {
  return (
    <div className={cn(CARD, "p-6 sm:p-7")}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-full border border-black/[0.12] text-[#0d0d0d]/70">
          <Lightbulb className="size-4" />
        </span>
        <h3 className="text-lg font-normal tracking-tight">
          Tips for better <span className="font-instrument italic">notes</span>
        </h3>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <li
            key={tip}
            className="flex gap-3 text-sm leading-relaxed text-[#0d0d0d]/60"
          >
            <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-[#0d0d0d]/40" />
            <span className="text-pretty">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
