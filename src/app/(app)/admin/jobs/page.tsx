import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminJobList } from "@/components/admin/job-list";
import { GeminiRestoreButton } from "@/components/admin/gemini-restore-button";
import type { AdminJobRow } from "@/lib/admin-jobs";
import { deriveJobHealth } from "@/lib/job-health";
import { JOBS_LEASE_MS } from "@/lib/jobs";
import {
  JOBS_CLEANUP_INTERVAL_HOURS,
  STALE_JOB_TTL_MS,
  TERMINAL_JOB_RETENTION_MS,
  getJobLastActivityMs,
  isIncompleteJobStatus,
  resolveJobAutoDelete,
} from "@/lib/jobs-retention";
import { getActiveAlert } from "@/lib/alerts";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LectureJobRecord, LectureSegmentRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Jobs · Admin" };
export const dynamic = "force-dynamic";

function formatHours(ms: number) {
  return Math.round(ms / 3_600_000);
}

function formatDays(ms: number) {
  return Math.round(ms / (24 * 3_600_000));
}

export default async function AdminJobsPage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  const db = createAdminClient();
  const spendCapActive = !!(await getActiveAlert("GEMINI_SPEND_CAP"));
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select(
      "id, user_id, note_id, status, segment_count, attempts, heartbeat_at, error, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  const jobRows = (jobs ?? []) as LectureJobRecord[];
  const jobIds = jobRows.map((job) => job.id);

  const { data: segmentRows } = jobIds.length
    ? await db
        .from("lecture_segments")
        .select("job_id, status, updated_at")
        .in("job_id", jobIds)
    : { data: [] as Pick<LectureSegmentRecord, "job_id" | "status" | "updated_at">[] };

  const segmentsByJob = new Map<string, Pick<LectureSegmentRecord, "status" | "updated_at">[]>();
  for (const segment of segmentRows ?? []) {
    const list = segmentsByJob.get(segment.job_id) ?? [];
    list.push(segment);
    segmentsByJob.set(segment.job_id, list);
  }

  const now = Date.now();
  const rows: AdminJobRow[] = jobRows.map((job) => {
    const segments = segmentsByJob.get(job.id) ?? [];
    const latestSegmentUpdatedAt = segments.reduce<string | null>((latest, segment) => {
      if (!latest || segment.updated_at > latest) return segment.updated_at;
      return latest;
    }, null);
    const lastActivityMs = getJobLastActivityMs(job, latestSegmentUpdatedAt, now);
    const updatedAtMs = new Date(job.updated_at).getTime();
    const autoDelete = resolveJobAutoDelete(job.status, lastActivityMs, updatedAtMs);
    const health = deriveJobHealth(
      { status: job.status, error: job.error, heartbeatAt: job.heartbeat_at },
      { now, leaseMs: JOBS_LEASE_MS, spendCapActive }
    );

    return {
      id: job.id,
      status: job.status,
      userId: job.user_id,
      noteId: job.note_id,
      segmentCount: job.segment_count,
      segmentRows: segments.length,
      uploadedSegments: segments.filter((segment) => segment.status === "uploaded").length,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      heartbeatAt: job.heartbeat_at,
      lastActivityAt: new Date(lastActivityMs).toISOString(),
      autoDeleteAt: new Date(autoDelete.atMs).toISOString(),
      autoDeleteKind: autoDelete.kind,
      health: health.key,
      healthLabel: health.label,
    };
  });

  const incompleteCount = rows.filter((row) => isIncompleteJobStatus(row.status)).length;
  const pendingCleanupCount = rows.filter(
    (row) => Date.parse(row.autoDeleteAt) <= now
  ).length;

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-6xl">
        <AdminBackLink fallbackHref="/admin" label="Back" />

        <div className="mt-4">
          <GeminiRestoreButton />
        </div>

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <ListOrdered className="size-3.5" />
            Admin
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Lecture jobs</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
            Job and note IDs only — no lecture titles or filenames. Stuck jobs are
            removed after {formatHours(STALE_JOB_TTL_MS)} hours of inactivity; finished
            job records are purged after {formatDays(TERMINAL_JOB_RETENTION_MS)} days.
            Cleanup runs every {JOBS_CLEANUP_INTERVAL_HOURS} hours.
            {incompleteCount > 0
              ? ` ${incompleteCount} open job${incompleteCount === 1 ? "" : "s"} right now`
              : ""}
            {pendingCleanupCount > 0
              ? ` · ${pendingCleanupCount} overdue for cleanup`
              : ""}
            .
          </p>
        </div>

        <div className="mt-8">
          {rows.length === 0 ? (
            <div className="rounded-[4px] border border-dashed bg-card px-6 py-16 text-center shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="mx-auto grid size-12 place-items-center rounded-[4px] border border-primary/25 bg-primary/10 text-primary">
                <ListOrdered className="size-5" />
              </div>
              <h2 className="mt-4 font-medium">No jobs yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                New recordings and uploads will appear here while they move through the pipeline.
              </p>
            </div>
          ) : (
            <AdminJobList jobs={rows} />
          )}
        </div>
      </div>
    </main>
  );
}
