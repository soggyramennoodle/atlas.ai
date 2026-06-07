import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import {
  STALE_JOB_TTL_MS,
  getJobLastActivityMs,
  isIncompleteJobStatus,
  isJobStaleForCleanup,
} from "@/lib/jobs-retention";
import type { LectureJobRecord, LectureSegmentRecord } from "@/lib/types";

export type StaleJobCleanupResult = {
  scanned: number;
  deleted: number;
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
 * Removes incomplete lecture jobs that have been idle longer than
 * `STALE_JOB_TTL_MS`. Also deletes any linked processing note and R2 segment
 * objects so abandoned uploads do not linger forever.
 */
export async function runStaleJobCleanup(
  now: number = Date.now(),
  ttlMs: number = STALE_JOB_TTL_MS
): Promise<StaleJobCleanupResult> {
  const db = createAdminClient();

  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("id, note_id, status, created_at, updated_at, heartbeat_at")
    .in("status", ["recording", "recording_complete", "processing"]);

  const rows = (jobs ?? []) as Pick<
    LectureJobRecord,
    "id" | "note_id" | "status" | "created_at" | "updated_at" | "heartbeat_at"
  >[];

  if (rows.length === 0) {
    return { scanned: 0, deleted: 0, jobIds: [] };
  }

  const jobIds = rows.map((job) => job.id);
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

  const staleJobs = rows.filter((job) => {
    if (!isIncompleteJobStatus(job.status)) return false;
    const segments = segmentsByJob.get(job.id) ?? [];
    const latestSegmentUpdatedAt = segments.reduce<string | null>((latest, segment) => {
      if (!latest || segment.updated_at > latest) return segment.updated_at;
      return latest;
    }, null);
    const lastActivityMs = getJobLastActivityMs(job, latestSegmentUpdatedAt, now);
    return isJobStaleForCleanup(lastActivityMs, now, ttlMs);
  });

  const deletedJobIds: string[] = [];

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

    deletedJobIds.push(job.id);
  }

  return {
    scanned: rows.length,
    deleted: deletedJobIds.length,
    jobIds: deletedJobIds,
  };
}
