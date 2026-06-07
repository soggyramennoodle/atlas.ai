import { cn } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TONES,
  type AdminJobRow,
} from "@/lib/admin-jobs";
import { formatAutoDeleteCountdown } from "@/lib/jobs-retention";
import type { LectureJobStatus } from "@/lib/types";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function JobStatusChip({
  status,
  className,
}: {
  status: LectureJobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider",
        JOB_STATUS_TONES[status],
        className
      )}
    >
      <span className="size-1.5 bg-current" />
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

export function AdminJobList({ jobs }: { jobs: AdminJobRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[4px] border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Job</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Segments</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3 font-medium">Auto-delete</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {jobs.map((job) => (
            <tr key={job.id} className="align-top transition hover:bg-secondary/40">
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <JobStatusChip status={job.status} />
                  {job.error ? (
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-rose-500">
                      {job.error}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 max-w-md truncate font-medium">{job.sessionLabel}</p>
                <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                  {job.id}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <p className="max-w-[12rem] truncate">{job.userEmail ?? "Unknown user"}</p>
                <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                  {job.userId.slice(0, 8)}…
                </p>
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                <p>
                  {job.segmentRows}
                  {job.segmentCount != null ? ` / ${job.segmentCount}` : ""} uploaded
                </p>
                {job.uploadedSegments > 0 ? (
                  <p className="mt-0.5 text-xs">{job.uploadedSegments} awaiting transcription</p>
                ) : null}
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                {formatTimestamp(job.lastActivityAt)}
              </td>
              <td className="px-4 py-3.5">
                {job.autoDeleteAt ? (
                  <>
                    <p className="font-medium">
                      {formatAutoDeleteCountdown(Date.parse(job.autoDeleteAt))}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTimestamp(job.autoDeleteAt)}
                    </p>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
