import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  SEVERITY_META,
  STATUS_META,
  type NewsroomCategory,
  type NewsroomSeverity,
  type NewsroomStatus,
} from "@/lib/newsroom";

/** Tailwind classes per category tone — translucent, glass-friendly chips. */
const TONE: Record<string, string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

export function CategoryChip({
  category,
  className,
}: {
  category: NewsroomCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
        TONE[meta?.tone ?? "primary"],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta?.label ?? category}
    </span>
  );
}

/** Status pill for the admin list. */
export function StatusChip({
  status,
  className,
}: {
  status: NewsroomStatus;
  className?: string;
}) {
  const tone =
    status === "published"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : status === "draft"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
        tone,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_META[status]?.label ?? status}
    </span>
  );
}

/** Severity banner accent for notices/maintenance/security articles. */
export function SeverityChip({
  severity,
  className,
}: {
  severity: NewsroomSeverity;
  className?: string;
}) {
  const tone =
    severity === "critical"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
      : severity === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-sky-500/30 bg-sky-500/10 text-sky-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
        tone,
        className
      )}
    >
      {SEVERITY_META[severity]?.label ?? severity}
    </span>
  );
}
