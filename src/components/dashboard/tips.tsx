import { Lightbulb } from "lucide-react";
import { GLASS_DARK } from "@/components/app/glass";
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
    <div className={cn(GLASS_DARK, "rounded-3xl p-6 sm:p-7")}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-full border border-white/20 text-white/75">
          <Lightbulb className="size-4" />
        </span>
        <h3 className="text-lg font-normal tracking-tight text-white">
          Tips for better <span className="font-instrument italic">notes</span>
        </h3>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <li
            key={tip}
            className="flex gap-3 text-sm leading-relaxed text-white/70"
          >
            <span className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-white/45" />
            <span className="text-pretty">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
