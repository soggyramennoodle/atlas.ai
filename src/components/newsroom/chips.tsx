import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  SEVERITY_META,
  STATUS_META,
  type NewsroomCategory,
  type NewsroomSeverity,
  type NewsroomStatus,
} from "@/lib/newsroom";

/* Public newsroom chips are fully monochrome in the cinematic light language;
   category tones are intentionally collapsed to one ink pill. */
const MONO_CHIP =
  "font-heading inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[1.5px] text-black/60";

export function CategoryChip({
  category,
  className,
}: {
  category: NewsroomCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <span className={cn(MONO_CHIP, className)}>
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
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700"
      : status === "draft"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-700"
        : "border-black/[0.08] bg-black/[0.03] text-black/45";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em]",
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
  return (
    <span className={cn(MONO_CHIP, className)}>
      {SEVERITY_META[severity]?.label ?? severity}
    </span>
  );
}
