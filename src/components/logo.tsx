import { cn } from "@/lib/utils";

/**
 * Atlas wordmark — a compact globe/meridian mark plus the name.
 * `mark` renders just the icon.
 */
export function Logo({
  className,
  mark = false,
}: {
  className?: string;
  mark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-[0.7rem] bg-primary text-primary-foreground shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-[1.15rem]"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M3.5 12h17M12 3.5c2.6 2.3 4 5.3 4 8.5s-1.4 6.2-4 8.5c-2.6-2.3-4-5.3-4-8.5s1.4-6.2 4-8.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!mark && (
        <span className="text-[1.15rem] font-semibold tracking-tight">
          Atlas
        </span>
      )}
    </span>
  );
}
