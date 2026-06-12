import type { JobAutoDeleteKind } from "@/lib/jobs-retention";
import type { LectureJobStatus } from "@/lib/types";

/** True when a job can still be cancelled (not already terminal). */
export function isJobCancellable(status: string): boolean {
  return (
    status === "recording" ||
    status === "recording_complete" ||
    status === "processing" ||
    status === "enriching"
  );
}

export function formatAdminId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export type AdminJobRow = {
  id: string;
  status: LectureJobStatus;
  userId: string;
  userEmail: string | null;
  noteId: string | null;
  segmentCount: number | null;
  segmentRows: number;
  uploadedSegments: number;
  attempts: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  heartbeatAt: string | null;
  lastActivityAt: string;
  autoDeleteAt: string;
  autoDeleteKind: JobAutoDeleteKind;
  health: import("@/lib/job-health").JobHealthKey;
  healthLabel: string;
};

export const JOB_STATUS_LABELS: Record<LectureJobStatus, string> = {
  recording: "Recording",
  recording_complete: "Queued",
  processing: "Processing",
  enriching: "Enriching",
  ready: "Ready",
  failed: "Failed",
};

export const JOB_STATUS_TONES: Record<LectureJobStatus, string> = {
  recording: "border-amber-500/35 bg-amber-500/10 text-amber-700",
  recording_complete: "border-sky-500/35 bg-sky-500/10 text-sky-700",
  processing: "border-violet-500/35 bg-violet-500/10 text-violet-700",
  enriching: "border-amber-500/35 bg-amber-500/10 text-amber-700",
  ready: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700",
  failed: "border-[#0d0d0d] bg-[#0d0d0d] text-white",
};
