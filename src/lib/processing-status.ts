/**
 * Admin processing-monitor domain logic — pure, framework-free, and safe to
 * unit-test. Turns a sanitized job row + its segment tallies into a single
 * human-readable "stage" (what's actually happening right now), and decides
 * which finished jobs should still appear on the admin list.
 *
 * Deliberately content-free: this module never sees note text, transcripts,
 * lecture titles, or the user id — only the bookkeeping needed to tell where a
 * job is in the pipeline. See `processing-server.ts` for the fetch/sanitize.
 */
import type { LectureJobStatus, LectureSegmentStatus } from "./types";

/**
 * How long a finished (`ready`/`failed`) job lingers on the admin list before
 * it's filtered out, keeping the view to live work. Active jobs always show.
 */
export const PROCESSING_DONE_RETENTION_MS = 30 * 60 * 1000;

/** Default worker-lease window; mirrors JOBS_LEASE_MS so client renders match. */
export const DEFAULT_LEASE_MS = 90_000;

/** Count of a job's segments grouped by their pipeline status. */
export interface SegmentTally {
  total: number;
  uploaded: number;
  transcribing: number;
  transcribed: number;
  failed: number;
}

/** Empty tally; segment statuses are folded into it as rows are scanned. */
export function emptyTally(): SegmentTally {
  return { total: 0, uploaded: 0, transcribing: 0, transcribed: 0, failed: 0 };
}

/** Fold a list of segment statuses into a {@link SegmentTally}. */
export function tallySegments(statuses: LectureSegmentStatus[]): SegmentTally {
  const t = emptyTally();
  for (const status of statuses) {
    t.total += 1;
    t[status] += 1;
  }
  return t;
}

/**
 * The privacy-safe shape sent to the browser. No user id, no session label
 * (it can be a user-typed lecture title), no transcript, no R2 key.
 */
export interface ProcessingJobView {
  jobId: string;
  noteId: string | null;
  status: LectureJobStatus;
  source: "microphone" | "device";
  /** Declared target segment count (known once recording completes). */
  segmentCount: number | null;
  totalSeconds: number | null;
  attempts: number;
  heartbeatAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  segments: SegmentTally;
}

/** Coarse stage key used for badge colouring on the client. */
export type ProcessingStageKey =
  | "recording"
  | "uploading"
  | "queued"
  | "transcribing"
  | "composing"
  | "stalled"
  | "ready"
  | "failed";

export interface ProcessingStage {
  key: ProcessingStageKey;
  /** Human-readable, content-free description of the current step. */
  label: string;
  /** Transcription progress in [0, 1] when meaningfully known. */
  progress?: number;
}

/** A worker's claim is stale (job idle/abandoned) when null or past the lease. */
function leaseIsStale(
  heartbeatAt: string | null,
  now: number,
  leaseMs: number
): boolean {
  if (!heartbeatAt) return true;
  return now - new Date(heartbeatAt).getTime() > leaseMs;
}

/**
 * Derive the current stage of a job from its status, segment tally, and worker
 * heartbeat. The browser-only steps the recorder shows ("splitting",
 * "redirecting") aren't persisted, so they're approximated from real data:
 * a `recording` job with segments present is mid-upload, and a `processing`
 * job whose lease has gone stale is surfaced as "stalled" rather than active.
 */
export function deriveStage(
  job: ProcessingJobView,
  opts: { now?: number; leaseMs?: number } = {}
): ProcessingStage {
  const now = opts.now ?? Date.now();
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
  const seg = job.segments;
  const target = job.segmentCount ?? seg.total;
  const resolved = seg.transcribed + seg.failed;
  const progress = target > 0 ? resolved / target : undefined;

  switch (job.status) {
    case "ready":
      return { key: "ready", label: "Ready" };

    case "failed":
      return {
        key: "failed",
        label: job.error ? `Failed · ${job.error}` : "Failed",
      };

    case "recording":
      // No note exists yet; the client is still capturing/uploading segments.
      return seg.total === 0
        ? { key: "recording", label: "Recording" }
        : {
            key: "uploading",
            label: `Uploading segments (${seg.total} uploaded)`,
          };

    case "recording_complete":
      return { key: "queued", label: "Queued for worker" };

    case "processing": {
      const fresh = !leaseIsStale(job.heartbeatAt, now, leaseMs);
      if (!fresh) {
        return {
          key: "stalled",
          label: `Stalled — ${resolved}/${target} segments transcribed`,
          progress,
        };
      }
      // Every uploaded segment resolved and the full set is present → compose.
      if (
        seg.total > 0 &&
        job.segmentCount != null &&
        seg.total >= job.segmentCount &&
        seg.transcribing === 0 &&
        seg.uploaded === 0
      ) {
        return { key: "composing", label: "Composing notes" };
      }
      if (seg.transcribing > 0) {
        return {
          key: "transcribing",
          label: `Transcribing segment ${Math.min(resolved + 1, target)}/${target}`,
          progress,
        };
      }
      return {
        key: "transcribing",
        label: `Processing — ${resolved}/${target} segments transcribed`,
        progress,
      };
    }
  }
}

/**
 * Whether a job should appear on the admin list right now. Active jobs always
 * show; finished ones (`ready`/`failed`) drop off once they're older than the
 * retention window, keeping the list to current work.
 */
export function isVisibleJob(
  job: Pick<ProcessingJobView, "status" | "updatedAt">,
  now: number = Date.now(),
  retentionMs: number = PROCESSING_DONE_RETENTION_MS
): boolean {
  if (
    job.status === "recording" ||
    job.status === "recording_complete" ||
    job.status === "processing"
  ) {
    return true;
  }
  return now - new Date(job.updatedAt).getTime() <= retentionMs;
}
