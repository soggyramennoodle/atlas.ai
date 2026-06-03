import Link from "next/link";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyRecordings() {
  return (
    <div className="relative grid place-items-center overflow-hidden rounded-[1.75rem] border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.4] [mask-image:radial-gradient(50%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative">
        {/* illustration: orbit + waveform sheet */}
        <svg
          viewBox="0 0 200 140"
          className="mx-auto h-32 w-auto text-primary"
          fill="none"
          aria-hidden
        >
          <ellipse
            cx="100"
            cy="70"
            rx="78"
            ry="30"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="3 5"
          />
          <rect
            x="62"
            y="34"
            width="76"
            height="72"
            rx="12"
            className="fill-card"
            stroke="currentColor"
            strokeOpacity="0.35"
          />
          {[74, 86, 98, 110, 122].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={70 - [10, 20, 26, 16, 8][i]}
              width="5"
              height={[20, 40, 52, 32, 16][i]}
              rx="2.5"
              fill="currentColor"
              fillOpacity={0.55}
            />
          ))}
          <circle cx="178" cy="52" r="4" fill="currentColor" />
        </svg>

        <h2 className="mt-6 text-xl font-semibold tracking-tight">
          Your library is empty — for now
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground text-pretty">
          Record your first lecture and Atlas will turn it into thorough,
          structured notes that land right here.
        </p>
        <Button asChild className="mt-6 shimmer">
          <Link href="/upload">
            <Mic className="size-4" />
            Record your first lecture
          </Link>
        </Button>
      </div>
    </div>
  );
}
