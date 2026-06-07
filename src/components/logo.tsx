import { cn } from "@/lib/utils";
import { ATLAS_MARK_PATH, ATLAS_MARK_VIEWBOX } from "@/components/atlas-mark-path";

/**
 * Territory A mark — folded, load-bearing geometric "A". Filled with
 * currentColor so it inherits the brand primary and adapts to dark mode.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={ATLAS_MARK_VIEWBOX}
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
    >
      <path fill="currentColor" d={ATLAS_MARK_PATH} />
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

const SIZE_CLASS = {
  default: "text-[1.35rem]",
  lg: "text-[1.5rem]",
} as const;

/**
 * Integrated Atlas wordmark — the folded A mark *is* the first letter,
 * followed by "tlas" in the same weight. `mark` renders just the glyph.
 */
export function Logo({
  className,
  mark = false,
  beta = false,
  size = "default",
}: {
  className?: string;
  mark?: boolean;
  beta?: boolean;
  /** `lg` bumps the wordmark a touch — used by the floating site header. */
  size?: "default" | "lg";
}) {
  if (mark) return <AtlasMark className={className} />;

  const textSize = SIZE_CLASS[size];

  return (
    <span
      className={cn(
        "inline-flex items-baseline text-primary",
        textSize,
        className
      )}
      aria-label="Atlas"
    >
      <AtlasMark className="mr-[-0.06em] h-[0.94em] w-[0.86em] translate-y-[0.05em]" />
      <span className="font-semibold leading-none tracking-tight">tlas</span>
      {beta && <BetaBadge />}
    </span>
  );
}
