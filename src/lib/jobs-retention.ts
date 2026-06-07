import type { LectureJobStatus } from "./types";

/** How long an incomplete job may sit idle before automatic deletion. */
export const STALE_JOB_TTL_MS =
  Number(process.env.STALE_JOB_TTL_MS) || 24 * 60 * 60 * 1000;

/** How often the cleanup cron runs (for admin copy only). */
export const JOBS_CLEANUP_INTERVAL_HOURS =
  Number(process.env.JOBS_CLEANUP_INTERVAL_HOURS) || 4;

export function isIncompleteJobStatus(status: LectureJobStatus): boolean {
  return (
    status === "recording" ||
    status === "recording_complete" ||
    status === "processing"
  );
}

/** Latest meaningful activity for retention decisions. */
export function getJobLastActivityMs(
  job: {
    created_at: string;
    updated_at: string;
    heartbeat_at: string | null;
  },
  latestSegmentUpdatedAt: string | null | undefined,
  now: number = Date.now()
): number {
  const timestamps = [
    job.created_at,
    job.updated_at,
    job.heartbeat_at,
    latestSegmentUpdatedAt,
  ]
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return now;
  return Math.max(...timestamps);
}

export function getJobAutoDeleteAtMs(
  lastActivityMs: number,
  ttlMs: number = STALE_JOB_TTL_MS
): number {
  return lastActivityMs + ttlMs;
}

export function isJobStaleForCleanup(
  lastActivityMs: number,
  now: number = Date.now(),
  ttlMs: number = STALE_JOB_TTL_MS
): boolean {
  return now - lastActivityMs >= ttlMs;
}

/** Human-readable countdown for the admin job list. */
export function formatAutoDeleteCountdown(
  autoDeleteAtMs: number,
  now: number = Date.now()
): string {
  const remaining = autoDeleteAtMs - now;
  if (remaining <= 0) return "Pending cleanup";

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}
