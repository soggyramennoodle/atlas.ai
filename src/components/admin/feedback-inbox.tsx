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
import {
  ADMIN_BADGE,
  ADMIN_BTN,
  ADMIN_BTN_GHOST,
  ADMIN_TEXTAREA,
  AdminEmpty,
  CARD,
} from "@/components/admin/admin-kit";
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
        ADMIN_BADGE,
        tone === "alert" && "border-amber-300/40 bg-amber-300/15 text-amber-200",
        tone === "neutral" && "border-white/20 bg-white/[0.08] text-white/75",
        tone === "ok" && "border-emerald-300/40 bg-emerald-300/15 text-emerald-200",
        tone === "muted" && "border-white/15 bg-white/[0.05] text-white/45"
      )}
    >
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  );
}

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[0.7rem] font-medium text-white/60">
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
        <div className="flex flex-wrap gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1">
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
                  "rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
                  active
                    ? "bg-white text-[#0d0d0d]"
                    : "text-white/60 hover:bg-white/[0.08] hover:text-white"
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
                "rounded-full border px-3 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
                active
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/15 text-white/60 hover:border-white/30 hover:text-white"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty
          icon={Flag}
          title="No reports in this view"
          body="User reports from notes and the sidebar land here."
        />
      ) : (
        <ul className={cn(CARD, "divide-y divide-white/10 overflow-hidden")}>
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
        CARD,
        "rounded-2xl px-4 py-3",
        alert && "border-amber-300/35 bg-amber-300/[0.08]"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-normal tabular-nums tracking-tight text-white",
          alert && "text-amber-200"
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
    <button
      type="button"
      disabled={disabled || pending}
      className={ADMIN_BTN}
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
    </button>
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
        "px-5 py-4 transition-colors",
        row.status === "unread" && "bg-amber-300/[0.07]"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <CategoryBadge category={row.category} />
            <span className="text-xs text-white/50">
              {formatFeedbackWhen(row.created_at)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-white">
            {row.message?.trim() || "No details provided."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            {row.reporter_email && <span>{row.reporter_email}</span>}
            {row.note_title && (
              <span>
                Note: <span className="text-white">{row.note_title}</span>
              </span>
            )}
            {row.page_path && <span>{row.page_path}</span>}
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {row.status === "unread" ? (
            <button
              type="button"
              disabled={pending}
              className={ADMIN_BTN}
              onClick={() => runStatus("read", "Marked as read.")}
            >
              Mark read
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className={ADMIN_BTN_GHOST}
              onClick={() => runStatus("unread", "Marked as unread.")}
            >
              Mark unread
            </button>
          )}
          {row.status !== "resolved" && (
            <button
              type="button"
              disabled={pending}
              className={ADMIN_BTN}
              onClick={() => runStatus("resolved", "Marked as resolved.")}
            >
              Resolve
            </button>
          )}
          {row.status !== "dismissed" && (
            <button
              type="button"
              disabled={pending}
              className={ADMIN_BTN_GHOST}
              onClick={() => runStatus("dismissed", "Dismissed report.")}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 rounded-2xl bg-white/[0.04] p-4">
          {row.message && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                Full message
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white">
                {row.message}
              </p>
            </div>
          )}

          {row.note_id && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/notes/${row.note_id}`}
                target="_blank"
                className={ADMIN_BTN}
              >
                <ExternalLink className="size-3.5" />
                Open note
              </Link>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-xs text-white/50">
            <MessageSquareText className="size-3.5" />
            Report {row.id.slice(0, 8)}
          </p>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
              Internal notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Triage notes — what you checked, fixed, or decided."
              rows={3}
              className={cn(ADMIN_TEXTAREA, "mt-2")}
            />
            {row.reviewed_at && (
              <p className="mt-2 text-xs text-white/50">
                Last reviewed {formatFeedbackWhen(row.reviewed_at)}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
