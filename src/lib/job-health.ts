import type { LectureJobStatus } from "./types";

export type JobHealthKey = "held" | "running" | "stuck" | "failed" | "ready" | "idle";

export interface JobHealth {
  key: JobHealthKey;
  label: string;
}

export interface JobHealthInput {
  status: LectureJobStatus;
  error: string | null;
  heartbeatAt: string | null;
}

export function isSpendCapHeld(error: string | null): boolean {
  return error === "gemini_spend_cap";
}

export function isAdminStopped(error: string | null): boolean {
  return error === "admin_stopped";
}

function leaseStale(heartbeatAt: string | null, now: number, leaseMs: number): boolean {
  if (!heartbeatAt) return true;
  return now - new Date(heartbeatAt).getTime() > leaseMs;
}

/** Derive a single coarse health badge for the admin jobs list. */
export function deriveJobHealth(
  job: JobHealthInput,
  opts: { now?: number; leaseMs?: number; spendCapActive?: boolean } = {}
): JobHealth {
  const now = opts.now ?? Date.now();
  const leaseMs = opts.leaseMs ?? 90_000;
  if (opts.spendCapActive && isSpendCapHeld(job.error)) {
    return { key: "held", label: "Held · at capacity" };
  }
  if (job.status === "ready") return { key: "ready", label: "Ready" };
  if (job.status === "failed") {
    return isAdminStopped(job.error)
      ? { key: "failed", label: "Stopped by admin" }
      : { key: "failed", label: "Failed" };
  }
  if (
    job.status === "processing" ||
    job.status === "recording_complete" ||
    job.status === "enriching"
  ) {
    return leaseStale(job.heartbeatAt, now, leaseMs)
      ? { key: "stuck", label: "Stuck" }
      : job.status === "enriching"
        ? { key: "running", label: "Enriching" }
        : { key: "running", label: "Running" };
  }
  return { key: "idle", label: "Idle" };
}
