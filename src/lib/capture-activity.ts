/** Client-side capture pipeline flags shared across recorder + uploader. */

export type CaptureActivity = {
  recorderActive: boolean;
  recorderUploading: boolean;
  fileUploading: boolean;
};

let activity: CaptureActivity = {
  recorderActive: false,
  recorderUploading: false,
  fileUploading: false,
};
const listeners = new Set<() => void>();

export function getCaptureActivity(): CaptureActivity {
  return activity;
}

export function setCaptureActivity(patch: Partial<CaptureActivity>) {
  const next = { ...activity, ...patch };
  if (
    next.recorderActive === activity.recorderActive &&
    next.recorderUploading === activity.recorderUploading &&
    next.fileUploading === activity.fileUploading
  ) {
    return;
  }
  activity = next;
  listeners.forEach((cb) => cb());
}

export function subscribeCaptureActivity(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function canShowRevocationForGrace(
  grace: "immediate" | "after_recording" | "after_upload"
): boolean {
  const { recorderActive, recorderUploading, fileUploading } = activity;
  const uploading = recorderUploading || fileUploading;

  if (grace === "after_recording") {
    return !recorderActive && !uploading;
  }
  if (grace === "after_upload") {
    return !uploading;
  }
  return true;
}
