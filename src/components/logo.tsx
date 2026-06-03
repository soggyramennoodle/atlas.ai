import { cn } from "@/lib/utils";

/**
 * Atlas mark — a geometric "A" built as a mountain/apex with the titan's
 * orbit arc swept through it (Atlas holding up the world + knowledge mapping).
 * Stroked in currentColor so it inherits the champagne gold.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 34 34"
      fill="none"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="atlas-mark" x1="6" y1="30" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      {/* orbit ring, tilted */}
      <ellipse
        cx="17"
        cy="15"
        rx="14.5"
        ry="6"
        transform="rotate(-32 17 15)"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.4"
      />
      {/* the apex / mountain "A" */}
      <path
        d="M5 29 L17 4 L29 29"
        stroke="url(#atlas-mark)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* crossbar */}
      <path
        d="M10.5 18.5 L23.5 18.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* planet on the orbit */}
      <circle cx="28.4" cy="9.6" r="2.1" fill="currentColor" />
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
