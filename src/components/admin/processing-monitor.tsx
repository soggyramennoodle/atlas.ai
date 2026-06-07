"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Mic,
  MonitorSmartphone,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProcessingStageKey,
  SegmentTally,
} from "@/lib/processing-status";
import type { ProcessingJobRow, ProcessingSnapshot } from "@/lib/processing-server";

const POLL_MS = 5_000;

/** Tailwind classes per stage, so the eye can scan the list by colour. */
const STAGE_TONE: Record<ProcessingStageKey, string> = {
  recording: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  uploading: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  queued:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  transcribing:
    "border-primary/30 bg-primary/10 text-primary",
  composing:
    "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  stalled:
    "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed:
    "border-destructive/40 bg-destructive/10 text-destructive",
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
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-xs font-medium",
        STAGE_TONE[row.stage.key]
      )}
    >
      <CircleDot className="size-3" />
      {row.stage.label}
    </span>
  );
}

function SegmentBar({ tally }: { tally: SegmentTally }) {
  if (tally.total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const parts: Array<[string, number, string]> = [
    ["transcribed", tally.transcribed, "bg-emerald-500"],
    ["transcribing", tally.transcribing, "bg-primary"],
    ["uploaded", tally.uploaded, "bg-sky-500"],
    ["failed", tally.failed, "bg-destructive"],
  ];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
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
      <span className="font-mono text-[0.65rem] text-muted-foreground">
        {tally.transcribed}/{tally.total} done
        {tally.failed > 0 ? ` · ${tally.failed} failed` : ""}
      </span>
    </div>
  );
}

function JobCard({ row, now }: { row: ProcessingJobRow; now: number }) {
  const SourceIcon = row.source === "device" ? MonitorSmartphone : Mic;
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 transition duration-300 ease-out hover:bg-secondary/55 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge row={row} />
          <span
            className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground"
            title={`source: ${row.source}`}
          >
            <SourceIcon className="size-3" />
            {row.source}
          </span>
          {row.attempts > 0 && (
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs">
          <span className="text-foreground" title={`job ${row.jobId}`}>
            job {shortId(row.jobId)}
          </span>
          <span className="text-muted-foreground" title={`note ${row.noteId ?? "—"}`}>
            note {row.noteId ? shortId(row.noteId) : "—"}
          </span>
        </div>
        {row.stage.key === "failed" && row.error && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            {row.error}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <SegmentBar tally={row.segments} />
      </div>

      <div className="shrink-0 text-right text-xs text-muted-foreground sm:w-32">
        <p title={new Date(row.createdAt).toLocaleString()}>
          started {relativeTime(row.createdAt, now)}
        </p>
        <p
          className="text-[0.7rem]"
          title={new Date(row.updatedAt).toLocaleString()}
        >
          updated {relativeTime(row.updatedAt, now)}
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
        <p className="text-sm text-muted-foreground">
          {jobs.length === 0
            ? "No active jobs."
            : `${jobs.length} job${jobs.length === 1 ? "" : "s"} in the last 30 min · auto-refreshing`}
          {error && <span className="ml-2 text-destructive">· {error}</span>}
        </p>
        <button
          onClick={poll}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/25 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-[4px] border border-dashed bg-card px-6 py-16 text-center shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid size-12 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
            <CircleDot className="size-5" />
          </div>
          <h2 className="mt-4 font-medium">Nothing processing</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Recordings and uploads in flight will appear here. Finished jobs drop
            off after 30 minutes.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-[4px] border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          {jobs.map((row) => (
            <JobCard key={row.jobId} row={row} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}
