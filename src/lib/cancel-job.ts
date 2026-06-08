import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import { isJobCancellable } from "@/lib/admin-jobs";
import type { StructuredNotes } from "@/lib/types";

function stoppedContent(): StructuredNotes {
  return {
    status: "failed",
    title: "Processing stopped",
    subject: "",
    summary: "Processing for this lecture was stopped.",
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

/**
 * Stop a lecture job immediately: clear the worker lease, fail open segments,
 * delete R2 audio, and mark the linked note failed. Idempotent for terminal jobs.
 */
export async function cancelLectureJob(jobId: string): Promise<{ cancelled: boolean }> {
  const db = createAdminClient();

  const { data: job } = await db
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { cancelled: false };
  if (!isJobCancellable(job.status)) return { cancelled: false };

  const { data: segments } = await db
    .from("lecture_segments")
    .select("r2_key")
    .eq("job_id", jobId);

  const keys = ((segments ?? []) as { r2_key: string | null }[])
    .map((s) => s.r2_key)
    .filter((k): k is string => !!k);

  await Promise.all(
    keys.map((key) =>
      r2.send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })).catch(() => {})
    )
  );

  const stamp = new Date().toISOString();

  await db
    .from("lecture_segments")
    .update({ status: "failed", updated_at: stamp })
    .eq("job_id", jobId)
    .neq("status", "failed");

  await db
    .from("lecture_jobs")
    .update({
      status: "failed",
      error: "admin_stopped",
      heartbeat_at: null,
      updated_at: stamp,
    })
    .eq("id", jobId);

  if (job.note_id) {
    await db
      .from("notes")
      .update({
        title: "Processing stopped",
        content: stoppedContent(),
      })
      .eq("id", job.note_id);
  }

  return { cancelled: true };
}
