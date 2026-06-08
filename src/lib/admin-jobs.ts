import type { JobAutoDeleteKind } from "@/lib/jobs-retention";
import type { LectureJobStatus } from "@/lib/types";

/** True when a job can still be cancelled (not already terminal). */
export function isJobCancellable(status: string): boolean {
  return status === "recording" || status === "recording_complete" || status === "processing";
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
  ready: "Ready",
  failed: "Failed",
};

export const JOB_STATUS_TONES: Record<LectureJobStatus, string> = {
  recording: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  recording_complete: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  processing: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-500",
};
