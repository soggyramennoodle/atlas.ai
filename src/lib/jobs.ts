import "server-only";
import type {
  LectureJobStatus,
  LectureSegmentRecord,
} from "./types";

/** How long a worker's claim on a job is honoured before it can be reclaimed. */
export const JOBS_LEASE_MS = Number(process.env.JOBS_LEASE_MS) || 90_000;
/** Per-tick wall-clock budget; yield before Vercel Hobby's 60s cap. */
export const JOBS_SLICE_BUDGET_MS =
  Number(process.env.JOBS_SLICE_BUDGET_MS) || 45_000;
/**
 * Max segments transcribed in parallel per worker tick. Default 4 balances
 * speed against Gemini burst rate limits on Hobby — not a magic number, just a
 * conservative starting point. Override with JOBS_SEGMENT_CONCURRENCY; the
 * worker steps down automatically on 429s.
 */
export const JOBS_SEGMENT_CONCURRENCY =
  Number(process.env.JOBS_SEGMENT_CONCURRENCY) || 4;

/** Step down parallel transcription after a rate-limit (429) hit. */
export function reduceSegmentConcurrency(current: number): number {
  if (current <= 1) return 1;
  return Math.max(1, Math.floor(current / 2));
}
/** Per-segment transcription retry ceiling. */
export const MAX_SEGMENT_ATTEMPTS = Number(process.env.MAX_SEGMENT_ATTEMPTS) || 3;
/** Whole-job retry ceiling. */
export const MAX_JOB_ATTEMPTS = Number(process.env.MAX_JOB_ATTEMPTS) || 5;

/** A heartbeat is stale (job reclaimable) when null or older than the lease. */
export function isLeaseStale(
  heartbeatAt: string | null,
  now: number = Date.now()
): boolean {
  if (!heartbeatAt) return true;
  return now - new Date(heartbeatAt).getTime() > JOBS_LEASE_MS;
}

/** The lowest-index segment still awaiting transcription, or null. */
export function nextSegmentToTranscribe(
  segments: LectureSegmentRecord[]
): LectureSegmentRecord | null {
  return (
    segments
      .filter((s) => s.status === "uploaded")
      .sort((a, b) => a.index - b.index)[0] ?? null
  );
}

/** True once no segment is still pending (every one transcribed or failed). */
export function allSegmentsResolved(
  segments: LectureSegmentRecord[]
): boolean {
  return segments.every(
    (s) => s.status === "transcribed" || s.status === "failed"
  );
}

/** Compose is allowed only once the lecture is fully recorded and resolved. */
export function jobIsComposable(
  status: LectureJobStatus,
  segmentCount: number | null,
  segments: LectureSegmentRecord[]
): boolean {
  if (status !== "recording_complete" && status !== "processing") return false;
  if (segmentCount == null) return false;
  if (segments.length < segmentCount) return false;
  return allSegmentsResolved(segments);
}
