import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import {
  STALE_JOB_TTL_MS,
  TERMINAL_JOB_RETENTION_MS,
  getJobLastActivityMs,
  isIncompleteJobStatus,
  isJobStaleForCleanup,
} from "@/lib/jobs-retention";
import type { LectureJobRecord, LectureSegmentRecord } from "@/lib/types";

export type JobCleanupResult = {
  scannedIncomplete: number;
  deletedIncomplete: number;
  scannedTerminal: number;
  deletedTerminal: number;
  jobIds: string[];
};

async function deleteSegmentObjects(keys: string[]) {
  await Promise.all(
    keys.map((key) =>
      r2
        .send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }))
        .catch(() => {})
    )
  );
}

/**
 * Removes abandoned lecture jobs and old finished job records.
 * - Incomplete jobs idle longer than `STALE_JOB_TTL_MS` delete linked notes too.
 * - Ready/failed rows older than `TERMINAL_JOB_RETENTION_MS` drop the job record
 *   only; user notes are kept.
 */
export async function runJobCleanup(
  now: number = Date.now(),
  staleTtlMs: number = STALE_JOB_TTL_MS,
  terminalRetentionMs: number = TERMINAL_JOB_RETENTION_MS
): Promise<JobCleanupResult> {
  const db = createAdminClient();
  const deletedIncompleteIds: string[] = [];
  const deletedTerminalIds: string[] = [];

  const { data: incompleteJobs } = await db
    .from("lecture_jobs")
    .select("id, note_id, status, created_at, updated_at, heartbeat_at")
    .in("status", ["recording", "recording_complete", "processing"]);

  const incompleteRows = (incompleteJobs ?? []) as Pick<
    LectureJobRecord,
    "id" | "note_id" | "status" | "created_at" | "updated_at" | "heartbeat_at"
  >[];

  if (incompleteRows.length > 0) {
    const jobIds = incompleteRows.map((job) => job.id);
    const { data: segmentRows } = await db
      .from("lecture_segments")
      .select("job_id, r2_key, updated_at")
      .in("job_id", jobIds);

    const segmentsByJob = new Map<string, LectureSegmentRecord[]>();
    for (const segment of (segmentRows ?? []) as Pick<
      LectureSegmentRecord,
      "job_id" | "r2_key" | "updated_at"
    >[]) {
      const list = segmentsByJob.get(segment.job_id) ?? [];
      list.push(segment as LectureSegmentRecord);
      segmentsByJob.set(segment.job_id, list);
    }

    const staleJobs = incompleteRows.filter((job) => {
      const segments = segmentsByJob.get(job.id) ?? [];
      const latestSegmentUpdatedAt = segments.reduce<string | null>((latest, segment) => {
        if (!latest || segment.updated_at > latest) return segment.updated_at;
        return latest;
      }, null);
      const lastActivityMs = getJobLastActivityMs(job, latestSegmentUpdatedAt, now);
      return isJobStaleForCleanup(lastActivityMs, now, staleTtlMs);
    });

    for (const job of staleJobs) {
      const segments = segmentsByJob.get(job.id) ?? [];
      await deleteSegmentObjects(segments.map((segment) => segment.r2_key));

      if (job.note_id) {
        const { error } = await db.from("notes").delete().eq("id", job.note_id);
        if (error) {
          console.error(`Failed to delete note for stale job ${job.id}:`, error);
          continue;
        }
      } else {
        const { error } = await db.from("lecture_jobs").delete().eq("id", job.id);
        if (error) {
          console.error(`Failed to delete stale job ${job.id}:`, error);
          continue;
        }
      }

      deletedIncompleteIds.push(job.id);
    }
  }

  const terminalCutoff = new Date(now - terminalRetentionMs).toISOString();
  const { data: terminalJobs } = await db
    .from("lecture_jobs")
    .select("id")
    .in("status", ["ready", "failed"])
    .lt("updated_at", terminalCutoff);

  const terminalRows = (terminalJobs ?? []) as Pick<LectureJobRecord, "id">[];
  for (const job of terminalRows) {
    const { error } = await db.from("lecture_jobs").delete().eq("id", job.id);
    if (error) {
      console.error(`Failed to delete terminal job record ${job.id}:`, error);
      continue;
    }
    deletedTerminalIds.push(job.id);
  }

  return {
    scannedIncomplete: incompleteRows.length,
    deletedIncomplete: deletedIncompleteIds.length,
    scannedTerminal: terminalRows.length,
    deletedTerminal: deletedTerminalIds.length,
    jobIds: [...deletedIncompleteIds, ...deletedTerminalIds],
  };
}

/** @deprecated Use runJobCleanup. */
export async function runStaleJobCleanup(
  now: number = Date.now(),
  ttlMs: number = STALE_JOB_TTL_MS
) {
  const result = await runJobCleanup(now, ttlMs);
  return {
    scanned: result.scannedIncomplete,
    deleted: result.deletedIncomplete,
    jobIds: result.jobIds,
  };
}
