"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Mic,
  MonitorSmartphone,
  AlertTriangle,
  CircleDot,
  OctagonX,
  Loader2,
} from "lucide-react";
import { isJobCancellable } from "@/lib/admin-jobs";
import { cn } from "@/lib/utils";
import {
  ADMIN_BADGE,
  ADMIN_BTN,
  AdminEmpty,
  CARD,
} from "@/components/admin/admin-kit";
import type {
  ProcessingStageKey,
  SegmentTally,
} from "@/lib/processing-status";
import type { ProcessingJobRow, ProcessingSnapshot } from "@/lib/processing-server";

const POLL_MS = 5_000;

/** Tailwind classes per stage, so the eye can scan the list by colour. */
const STAGE_TONE: Record<ProcessingStageKey, string> = {
  recording: "border-sky-300/40 bg-sky-300/15 text-sky-200",
  uploading: "border-sky-300/40 bg-sky-300/15 text-sky-200",
  queued: "border-amber-300/40 bg-amber-300/15 text-amber-200",
  transcribing: "border-violet-300/40 bg-violet-300/15 text-violet-200",
  composing: "border-violet-300/40 bg-violet-300/15 text-violet-200",
  stalled: "border-orange-300/40 bg-orange-300/15 text-orange-200",
  held: "border-orange-300/45 bg-orange-300/15 text-orange-200",
  ready: "border-emerald-300/40 bg-emerald-300/15 text-emerald-200",
  failed: "border-white/30 bg-white/15 text-white",
};

function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function StageBadge({ row }: { row: ProcessingJobRow }) {
  return (
    <span className={cn(ADMIN_BADGE, "w-fit", STAGE_TONE[row.stage.key])}>
      <CircleDot className="size-3" />
      {row.stage.label}
    </span>
  );
}

function SegmentBar({ tally }: { tally: SegmentTally }) {
  if (tally.total === 0) {
    return <span className="text-xs text-white/45">—</span>;
  }
  const parts: Array<[string, number, string]> = [
    ["transcribed", tally.transcribed, "bg-emerald-500"],
    ["transcribing", tally.transcribing, "bg-violet-500"],
    ["uploaded", tally.uploaded, "bg-sky-500"],
    ["failed", tally.failed, "bg-white"],
  ];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
        {parts.map(([key, count, color]) =>
          count > 0 ? (
            <span
              key={key}
              className={color}
              style={{ width: `${(count / tally.total) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <span className="font-mono text-[0.65rem] text-white/50">
        {tally.transcribed}/{tally.total} done
        {tally.failed > 0 ? ` · ${tally.failed} failed` : ""}
      </span>
    </div>
  );
}

function JobCard({
  row,
  now,
  onStopped,
}: {
  row: ProcessingJobRow;
  now: number;
  onStopped: () => void;
}) {
  const [stopping, setStopping] = useState(false);
  const SourceIcon = row.source === "device" ? MonitorSmartphone : Mic;
  const canStop = isJobCancellable(row.status);

  async function stopJob() {
    if (
      !window.confirm(
        "Stop this job and delete its uploaded audio? Gemini processing will halt immediately."
      )
    ) {
      return;
    }
    setStopping(true);
    try {
      const res = await fetch(`/api/admin/jobs/${row.jobId}/cancel`, { method: "POST" });
      if (res.ok) onStopped();
      else window.alert("Couldn't stop this job.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition duration-300 ease-out hover:bg-white/[0.04] sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge row={row} />
          <span
            className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.12em] text-white/50"
            title={`source: ${row.source}`}
          >
            <SourceIcon className="size-3" />
            {row.source}
          </span>
          {row.attempts > 0 && (
            <span className="font-mono text-[0.65rem] text-white/50">
              {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {row.userEmail ? (
          <p className="mt-1 text-sm text-white">{row.userEmail}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs">
          <span className="text-white/80" title={`job ${row.jobId}`}>
            job {shortId(row.jobId)}
          </span>
          <span className="text-white/50" title={`note ${row.noteId ?? "—"}`}>
            note {row.noteId ? shortId(row.noteId) : "—"}
          </span>
        </div>
        {row.stage.key === "failed" && row.error && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
            <AlertTriangle className="size-3.5 shrink-0" />
            {row.error}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <SegmentBar tally={row.segments} />
      </div>

      <div className="shrink-0 text-right text-xs text-white/50 sm:w-40">
        {canStop ? (
          <button
            onClick={stopJob}
            disabled={stopping}
            className="mb-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-0.5 text-xs text-white/70 outline-none transition hover:bg-white/[0.16] hover:text-white disabled:pointer-events-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {stopping ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <OctagonX className="size-3" />
            )}
            Stop
          </button>
        ) : null}
        <p title={new Date(row.createdAt).toLocaleString()}>
          started {relativeTime(row.createdAt, now)}
        </p>
        <p
          className="text-[0.7rem]"
          title={new Date(row.updatedAt).toLocaleString()}
        >
          updated {relativeTime(row.updatedAt, now)}
        </p>
        <p
          className={cn("text-[0.7rem]", !row.heartbeatAt && "text-orange-300")}
          title={
            row.heartbeatAt
              ? new Date(row.heartbeatAt).toLocaleString()
              : "Worker heartbeat cleared while held"
          }
        >
          heartbeat{" "}
          {row.heartbeatAt ? relativeTime(row.heartbeatAt, now) : "— none"}
        </p>
      </div>
    </li>
  );
}

export function ProcessingMonitor({
  initial,
}: {
  initial: ProcessingSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  // A monotonic local clock for relative times, ticked every second so ages
  // advance smoothly between the slower server polls.
  const [now, setNow] = useState(initial.now);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Offset between this browser's clock and the server's, so relative times
  // stay accurate even if the two are skewed. Set on mount and on each poll.
  const skewRef = useRef(0);

  const poll = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/processing", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status}).`);
      const data = (await res.json()) as ProcessingSnapshot;
      skewRef.current = data.now - Date.now();
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    // Establish clock skew from the server's snapshot time, then tick ages.
    skewRef.current = initial.now - Date.now();
    setNow(Date.now() + skewRef.current);
    const id = setInterval(() => setNow(Date.now() + skewRef.current), 1000);
    return () => clearInterval(id);
  }, [initial.now]);

  const jobs = snapshot.jobs;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-white/55">
          {jobs.length === 0
            ? "No active jobs."
            : `${jobs.length} job${jobs.length === 1 ? "" : "s"} in the last 30 min · auto-refreshing`}
          {error && (
            <span className="ml-2 inline-flex items-center gap-1 text-white/80">
              <AlertTriangle className="size-3.5" /> {error}
            </span>
          )}
        </p>
        <button onClick={poll} disabled={refreshing} className={ADMIN_BTN}>
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <AdminEmpty
          icon={CircleDot}
          title="Nothing processing"
          body="Recordings and uploads in flight will appear here. Finished jobs drop off after 30 minutes."
        />
      ) : (
        <ul className={cn(CARD, "divide-y divide-white/10 overflow-hidden")}>
          {jobs.map((row) => (
            <JobCard key={row.jobId} row={row} now={now} onStopped={poll} />
          ))}
        </ul>
      )}
    </div>
  );
}
