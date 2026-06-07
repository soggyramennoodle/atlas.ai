import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOBS_LEASE_MS } from "@/lib/jobs";
import {
  PROCESSING_DONE_RETENTION_MS,
  deriveStage,
  emptyTally,
  type ProcessingJobView,
  type ProcessingStage,
  type SegmentTally,
} from "@/lib/processing-status";
import type { LectureJobStatus, LectureSegmentStatus } from "@/lib/types";

/** A view plus its precomputed stage, ready to render. */
export interface ProcessingJobRow extends ProcessingJobView {
  stage: ProcessingStage;
}

export interface ProcessingSnapshot {
  jobs: ProcessingJobRow[];
  /** Server clock at fetch time, so the client can compute relative ages. */
  now: number;
  /** Worker lease window, echoed for parity with the server's stalled calc. */
  leaseMs: number;
}

// Only the bookkeeping columns — never user_id, session_label, live_transcript.
const JOB_COLUMNS =
  "id, note_id, status, segment_count, total_seconds, source, attempts, heartbeat_at, error, created_at, updated_at" as const;

interface JobRow {
  id: string;
  note_id: string | null;
  status: LectureJobStatus;
  segment_count: number | null;
  total_seconds: number | null;
  source: "microphone" | "device";
  attempts: number;
  heartbeat_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Read every job that is either active or finished within the retention window,
 * attach a per-job segment tally, and derive each one's current stage. Uses the
 * service-role client (admin pages run server-side behind an admin gate) so it
 * sees all users' jobs — but returns only content-free bookkeeping.
 */
export async function getProcessingSnapshot(): Promise<ProcessingSnapshot> {
  const db = createAdminClient();
  const now = Date.now();
  const cutoff = new Date(now - PROCESSING_DONE_RETENTION_MS).toISOString();

  // Active jobs always; finished ones only while still within the window. The
  // same predicate is enforced in isVisibleJob, but filtering in SQL keeps the
  // payload small.
  const { data: jobData } = await db
    .from("lecture_jobs")
    .select(JOB_COLUMNS)
    .or(
      `status.in.(recording,recording_complete,processing),updated_at.gte.${cutoff}`
    )
    .order("created_at", { ascending: true });

  const jobs = (jobData as JobRow[] | null) ?? [];
  if (jobs.length === 0) return { jobs: [], now, leaseMs: JOBS_LEASE_MS };

  // One round trip for all segments, tallied per job (no transcript columns).
  const { data: segData } = await db
    .from("lecture_segments")
    .select("job_id, status")
    .in(
      "job_id",
      jobs.map((j) => j.id)
    );

  const tallies = new Map<string, SegmentTally>();
  for (const row of (segData as { job_id: string; status: LectureSegmentStatus }[] | null) ?? []) {
    const tally = tallies.get(row.job_id) ?? emptyTally();
    tally.total += 1;
    tally[row.status] += 1;
    tallies.set(row.job_id, tally);
  }

  const rows: ProcessingJobRow[] = jobs.map((j) => {
    const view: ProcessingJobView = {
      jobId: j.id,
      noteId: j.note_id,
      status: j.status,
      source: j.source,
      segmentCount: j.segment_count,
      totalSeconds: j.total_seconds,
      attempts: j.attempts,
      heartbeatAt: j.heartbeat_at,
      error: j.error,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
      segments: tallies.get(j.id) ?? emptyTally(),
    };
    return { ...view, stage: deriveStage(view, { now, leaseMs: JOBS_LEASE_MS }) };
  });

  return { jobs: rows, now, leaseMs: JOBS_LEASE_MS };
}
