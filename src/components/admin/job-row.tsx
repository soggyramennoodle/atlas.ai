"use client";

import { useState } from "react";
import { Copy, Check, RefreshCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TONES,
  formatAdminId,
  type AdminJobRow,
} from "@/lib/admin-jobs";
import { useAdminJobsRefresh } from "@/components/admin/admin-jobs-refresh";
import { formatAutoDeleteCountdown } from "@/lib/jobs-retention";
import type { JobHealthKey } from "@/lib/job-health";

const HEALTH_DOT: Record<JobHealthKey, string> = {
  held: "bg-rose-500",
  running: "bg-emerald-500",
  stuck: "bg-amber-500",
  failed: "bg-rose-500",
  ready: "bg-emerald-500",
  idle: "bg-muted-foreground/40",
};

function CopyId({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">{label} —</span>;
  return (
    <button
      type="button"
      title={`${label} ${value} (click to copy)`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 text-foreground hover:text-primary"
    >
      {label} {formatAdminId(value)}
      {copied ? (
        <Check className="size-3 text-emerald-500" />
      ) : (
        <Copy className="size-3 opacity-50" />
      )}
    </button>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function JobRow({ job }: { job: AdminJobRow }) {
  const { refresh } = useAdminJobsRefresh();
  const [requeuing, setRequeuing] = useState(false);
  const canRequeue = job.health === "failed" || job.health === "stuck";

  async function requeue() {
    setRequeuing(true);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/requeue`, { method: "POST" });
      if (res.ok) refresh();
      else window.alert("Couldn't requeue this job.");
    } finally {
      setRequeuing(false);
    }
  }

  return (
    <tr className="align-top transition hover:bg-secondary/40">
      {/* Job column */}
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
              JOB_STATUS_TONES[job.status]
            )}
          >
            <span className="size-1.5 bg-current" />
            {JOB_STATUS_LABELS[job.status]}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", HEALTH_DOT[job.health])} />
            {job.healthLabel}
          </span>
          {job.error && job.health !== "held" ? (
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-rose-500">
              {job.error}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs">
          <CopyId label="job" value={job.id} />
          <CopyId label="note" value={job.noteId} />
        </div>
      </td>

      {/* User column */}
      <td className="px-4 py-3.5">
        <CopyId label="user" value={job.userId} />
      </td>

      {/* Segments column */}
      <td className="px-4 py-3.5 text-muted-foreground">
        <p>
          {job.segmentRows}
          {job.segmentCount != null ? ` / ${job.segmentCount}` : ""} uploaded
        </p>
        {job.uploadedSegments > 0 ? (
          <p className="mt-0.5 text-xs">{job.uploadedSegments} awaiting transcription</p>
        ) : null}
      </td>

      {/* Last activity column */}
      <td className="px-4 py-3.5 text-muted-foreground">
        {formatTimestamp(job.lastActivityAt)}
      </td>

      {/* Auto-delete column */}
      <td className="px-4 py-3.5">
        <p className="font-medium">{formatAutoDeleteCountdown(Date.parse(job.autoDeleteAt))}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatTimestamp(job.autoDeleteAt)}</p>
        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
          {job.autoDeleteKind === "stale" ? "Abandoned job cleanup" : "Job record retention"}
        </p>
        {canRequeue ? (
          <button
            onClick={requeue}
            disabled={requeuing}
            className="mt-1.5 inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs hover:bg-secondary"
          >
            {requeuing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCcw className="size-3" />
            )}
            Requeue
          </button>
        ) : null}
      </td>
    </tr>
  );
}
