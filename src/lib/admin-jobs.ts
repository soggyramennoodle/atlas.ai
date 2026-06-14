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
  recording: "border-amber-300/40 bg-amber-300/15 text-amber-200",
  recording_complete: "border-sky-300/40 bg-sky-300/15 text-sky-200",
  processing: "border-violet-300/40 bg-violet-300/15 text-violet-200",
  enriching: "border-amber-300/40 bg-amber-300/15 text-amber-200",
  ready: "border-emerald-300/40 bg-emerald-300/15 text-emerald-200",
  failed: "border-white/30 bg-white/15 text-white",
};
