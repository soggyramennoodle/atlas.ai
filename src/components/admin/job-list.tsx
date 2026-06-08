import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, type AdminJobRow } from "@/lib/admin-jobs";
import { JobRow } from "@/components/admin/job-row";
import type { LectureJobStatus } from "@/lib/types";

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
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Segments</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3 font-medium">Auto-delete</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
