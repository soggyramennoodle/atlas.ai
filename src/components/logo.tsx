import { cn } from "@/lib/utils";

/**
 * Atlas mark — the geometric, interlocking "A" from the Atlas identity: an
 * impossible-triangle apex whose ribbons fold into the crossbar. Filled with
 * currentColor (even-odd), so it inherits the indigo-violet brand and adapts
 * to dark mode wherever it's placed.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 90.96"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M44.72,0 53.86,0 73.37,36.18 73.27,36.69 71.95,37.5 67.78,39.74 67.28,39.63 52.85,13.11 53.05,30.28 63.41,49.19 63.92,49.9 64.33,49.8 76.93,42.89 98.68,82.42 100,84.96 99.9,85.57 96.75,90.96 96.04,90.85 49.59,65.75 4.88,90.55 3.35,90.96 0,85.26 0.2,84.65 44,1.32Z M45.73,13.01 11.18,79.07 23.78,72.15 45.33,31.81 45.93,30.59 45.93,13.11Z M49.39,38.41 34.76,66.26 57.83,53.35 49.8,38.52Z M73.78,52.13 67.28,55.79 75.2,70.83 76.73,72.56 88.72,78.96 74.29,52.13Z M60.87,59.35 56.91,61.59 56.91,61.89 64.84,66.16 61.38,59.45Z"
      />
    </svg>
  );
}

/** A small glassy "beta" pill, superscripted next to the wordmark. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative -top-2 inline-flex items-center rounded-full border border-primary/40 bg-gradient-to-b from-primary/25 to-primary/5 px-1.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase leading-none tracking-[0.12em] text-primary shadow-sm backdrop-blur",
        className
      )}
    >
      beta
    </span>
  );
}

/**
 * Atlas wordmark — the mark followed by the name, kerned tight so the mark
 * reads as the leading "A". `mark` renders just the glyph; `beta` appends the
 * beta badge.
 */
export function Logo({
  className,
  mark = false,
  beta = false,
}: {
  className?: string;
  mark?: boolean;
  beta?: boolean;
}) {
  if (mark) return <AtlasMark className={className} />;

  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <AtlasMark className="size-7" />
      <span className="text-[1.35rem] font-semibold leading-none tracking-tight text-foreground">
        Atlas
      </span>
      {beta && <BetaBadge />}
    </span>
  );
}
