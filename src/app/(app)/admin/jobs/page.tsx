import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import {
  AdminJobsRefreshProvider,
  AdminJobsToolbar,
} from "@/components/admin/admin-jobs-refresh";
import { AdminJobList } from "@/components/admin/job-list";
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
import { fetchUserEmails } from "@/lib/admin-user-emails";
import { getActiveAlert } from "@/lib/alerts";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { ADMIN_EYEBROW, AdminEmpty } from "@/components/admin/admin-kit";
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
  const userEmails = await fetchUserEmails(jobRows.map((job) => job.user_id));

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

  // eslint-disable-next-line react-hooks/purity -- server page; point-in-time snapshot is intended
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
      userEmail: userEmails.get(job.user_id) ?? null,
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
    <AdminJobsRefreshProvider>
      <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
        <div className="mx-auto max-w-6xl">
          <AdminBackLink fallbackHref="/admin" label="Back" />

          <AdminJobsToolbar />

          <div className="mt-4">
            <span className={ADMIN_EYEBROW}>
              <ListOrdered className="size-3.5" />
              Admin
            </span>
            <h1 className="mt-4 text-3xl font-normal tracking-[-0.01em] text-[#0d0d0d]">
              Lecture <span className="font-instrument italic">jobs</span>
            </h1>
            <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[#0d0d0d]/60">
              Job and note IDs with owner email — no lecture titles or filenames. Stuck jobs are
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
              <AdminEmpty
                icon={ListOrdered}
                title="No jobs yet"
                body="New recordings and uploads will appear here while they move through the pipeline."
              />
            ) : (
              <AdminJobList jobs={rows} />
            )}
          </div>
        </div>
      </main>
    </AdminJobsRefreshProvider>
  );
}
