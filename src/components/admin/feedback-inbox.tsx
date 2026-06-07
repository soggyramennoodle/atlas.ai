"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCheck,
  ExternalLink,
  Flag,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_TONES,
  formatFeedbackWhen,
} from "@/lib/admin-feedback";
import {
  markAllFeedbackRead,
  updateFeedbackNotes,
  updateFeedbackStatus,
} from "@/app/(app)/admin/feedback/actions";
import type { AdminFeedbackRow, FeedbackCategory, FeedbackStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = FeedbackStatus | "all";
type CategoryFilter = FeedbackCategory | "all";

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const tone = FEEDBACK_STATUS_TONES[status];
  return (
    <span
      className={cn(
        "rounded-[3px] border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider",
        tone === "alert" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "neutral" && "border-border bg-secondary text-foreground",
        tone === "ok" && "border-primary/35 bg-primary/10 text-primary",
        tone === "muted" && "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  );
}

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  return (
    <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
      {FEEDBACK_CATEGORY_LABELS[category]}
    </span>
  );
}

export function FeedbackInbox({ rows }: { rows: AdminFeedbackRow[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unread");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(
      FEEDBACK_STATUSES.map((s) => [s, 0])
    ) as Record<FeedbackStatus, number>;
    for (const row of rows) byStatus[row.status] += 1;
    return { all: rows.length, ...byStatus };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Unread" value={counts.unread} alert={counts.unread > 0} />
        <StatCard label="Read" value={counts.read} />
        <StatCard label="Resolved" value={counts.resolved} />
        <StatCard label="Total" value={counts.all} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-[4px] border border-border bg-card p-1">
          {(["all", ...FEEDBACK_STATUSES] as const).map((status) => {
            const active = statusFilter === status;
            const label = status === "all" ? "All" : FEEDBACK_STATUS_LABELS[status];
            const count =
              status === "all" ? counts.all : counts[status as FeedbackStatus];
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-[3px] px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {label}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <MarkAllReadButton disabled={counts.unread === 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...FEEDBACK_CATEGORIES] as const).map((category) => {
          const active = categoryFilter === category;
          const label =
            category === "all" ? "All types" : FEEDBACK_CATEGORY_LABELS[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                "rounded-[4px] border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-border bg-card px-6 py-14 text-center">
          <Flag className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No reports in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            User reports from notes and the sidebar land here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-[4px] border border-border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          {filtered.map((row) => (
            <FeedbackRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[4px] border bg-card px-4 py-3",
        alert ? "border-destructive/35 bg-destructive/5" : "border-border"
      )}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          alert && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      className="gap-1.5"
      onClick={() => {
        startTransition(async () => {
          const res = await markAllFeedbackRead();
          if (!res.ok) {
            toast.error(res.error ?? "Couldn't mark all as read.");
            return;
          }
          toast.success("Marked all unread reports as read.");
          router.refresh();
        });
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCheck className="size-4" />
      )}
      Mark all read
    </Button>
  );
}

function FeedbackRow({ row }: { row: AdminFeedbackRow }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(row.status === "unread");
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [pending, startTransition] = useTransition();

  function runStatus(status: FeedbackStatus, okMessage: string) {
    startTransition(async () => {
      const res = await updateFeedbackStatus(row.id, status);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't update status.");
        return;
      }
      toast.success(okMessage);
      router.refresh();
    });
  }

  function saveNotes() {
    if (notes === (row.admin_notes ?? "")) return;
    startTransition(async () => {
      const res = await updateFeedbackNotes(row.id, notes);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't save notes.");
        return;
      }
      toast.success("Internal notes saved.");
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "px-4 py-4 transition-colors",
        row.status === "unread" && "bg-destructive/[0.03]"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <CategoryBadge category={row.category} />
            <span className="text-xs text-muted-foreground">
              {formatFeedbackWhen(row.created_at)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">
            {row.message?.trim() || "No details provided."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {row.reporter_email && <span>{row.reporter_email}</span>}
            {row.note_title && (
              <span>
                Note: <span className="text-foreground">{row.note_title}</span>
              </span>
            )}
            {row.page_path && <span>{row.page_path}</span>}
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {row.status === "unread" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => runStatus("read", "Marked as read.")}
            >
              Mark read
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => runStatus("unread", "Marked as unread.")}
            >
              Mark unread
            </Button>
          )}
          {row.status !== "resolved" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runStatus("resolved", "Marked as resolved.")}
            >
              Resolve
            </Button>
          )}
          {row.status !== "dismissed" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              className="text-muted-foreground"
              onClick={() => runStatus("dismissed", "Dismissed report.")}
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 rounded-[4px] border border-border bg-background p-4">
          {row.message && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Full message
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {row.message}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {row.note_id && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/notes/${row.note_id}`} target="_blank">
                  <ExternalLink className="size-3.5" />
                  Open note
                </Link>
              </Button>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquareText className="size-3.5" />
            Report {row.id.slice(0, 8)}
          </p>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Internal notes
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Triage notes — what you checked, fixed, or decided."
              rows={3}
              className="mt-2 rounded-[4px]"
            />
            {row.reviewed_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last reviewed {formatFeedbackWhen(row.reviewed_at)}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
