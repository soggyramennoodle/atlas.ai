import { cn } from "@/lib/utils";
import { ADMIN_BADGE, CARD } from "@/components/admin/admin-kit";
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
    <span className={cn(ADMIN_BADGE, JOB_STATUS_TONES[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

export function AdminJobList({ jobs }: { jobs: AdminJobRow[] }) {
  return (
    <div className={cn(CARD, "overflow-x-auto")}>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-black/[0.08] text-[11px] uppercase tracking-[0.16em] text-[#0d0d0d]/45">
          <tr>
            <th className="px-4 py-3 font-medium">Job</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Segments</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3 font-medium">Auto-delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06]">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
