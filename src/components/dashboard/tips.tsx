import { Lightbulb } from "lucide-react";

const TIPS = [
  "Place your device near the lecturer for the cleanest audio.",
  "Long lecture? Atlas handles multi-hour recordings, just let it run.",
  "Review the key concepts first; they're your fastest revision pass.",
  "No mic handy? Upload an existing recording from the record screen.",
];

export function Tips() {
  return (
    <div className="rounded-[1.75rem] border bg-card/70 p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="size-4" />
        </span>
        <h3 className="font-semibold tracking-tight">Tips for better notes</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-3 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="text-pretty">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
