"use client";

import { useState } from "react";
import { Copy, Check, RefreshCcw, Loader2, OctagonX } from "lucide-react";
import { isJobCancellable } from "@/lib/admin-jobs";
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
  held: "bg-orange-500",
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
  const [stopping, setStopping] = useState(false);
  const canRequeue = job.health === "failed" || job.health === "stuck";
  const canStop = isJobCancellable(job.status);

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

  async function stopJob() {
    if (!window.confirm("Stop this job and delete its uploaded audio? Gemini processing will halt immediately.")) {
      return;
    }
    setStopping(true);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/cancel`, { method: "POST" });
      if (res.ok) refresh();
      else window.alert("Couldn't stop this job.");
    } finally {
      setStopping(false);
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

      {/* Owner column */}
      <td className="px-4 py-3.5">
        {job.userEmail ? (
          <p className="text-sm text-foreground">{job.userEmail}</p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
        <div className="mt-0.5">
          <CopyId label="user" value={job.userId} />
        </div>
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
        <p>{formatTimestamp(job.lastActivityAt)}</p>
        <p
          className={cn(
            "mt-0.5 font-mono text-[0.65rem]",
            !job.heartbeatAt && job.health === "held"
              ? "text-orange-600 dark:text-orange-400"
              : "text-muted-foreground"
          )}
          title={
            job.heartbeatAt
              ? new Date(job.heartbeatAt).toLocaleString()
              : "No worker heartbeat"
          }
        >
          heartbeat {job.heartbeatAt ? formatTimestamp(job.heartbeatAt) : "—"}
        </p>
      </td>

      {/* Auto-delete column */}
      <td className="px-4 py-3.5">
        <p className="font-medium">{formatAutoDeleteCountdown(Date.parse(job.autoDeleteAt))}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatTimestamp(job.autoDeleteAt)}</p>
        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
          {job.autoDeleteKind === "stale" ? "Abandoned job cleanup" : "Job record retention"}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {canStop ? (
            <button
              onClick={stopJob}
              disabled={stopping}
              className="inline-flex items-center gap-1 rounded-[3px] border border-destructive/40 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10"
            >
              {stopping ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <OctagonX className="size-3" />
              )}
              Stop
            </button>
          ) : null}
          {canRequeue ? (
            <button
              onClick={requeue}
              disabled={requeuing}
              className="inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs hover:bg-secondary"
            >
              {requeuing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCcw className="size-3" />
              )}
              Requeue
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
