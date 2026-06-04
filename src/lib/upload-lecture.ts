import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export const MAX_BYTES = 2 * 1024 * 1024 * 1024; // R2 presign endpoint enforces the same 2 GB app-level limit.

export type CaptureStage = "idle" | "uploading" | "analyzing";
export type GenerationStatus = "ready" | "processing" | "failed";

/**
 * Strip any codec parameters from a MediaRecorder/file MIME type
 * (e.g. "audio/webm;codecs=opus" → "audio/webm"). The Gemini Files API
 * wants a bare type, and Storage is happy with one too.
 */
export function baseMimeType(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

/** Best-effort file extension for a given audio MIME type. */
export function extForMime(mime: string): string {
  const base = baseMimeType(mime);
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
  };
  return map[base] ?? "audio";
}

interface UploadArgs {
  supabase: SupabaseClient;
  userId: string;
  data: Blob | File;
  requestId?: string;
  /** Bare MIME type (no codec params) sent to Storage and Gemini. */
  mimeType: string;
  ext: string;
  durationSeconds: number | null;
  /** Best-effort in-browser live transcript (§7). Used only as a fallback. */
  liveTranscript?: string | null;
  signal?: AbortSignal;
  onStage: (stage: Exclude<CaptureStage, "idle">) => void;
}

/**
 * Uploads a lecture recording directly to R2, then asks the server to turn it
 * into notes. Shared by the in-browser recorder and the file uploader.
 * Returns the new note id. Throws a user-readable Error on failure.
 */
export async function uploadLectureAndGenerate({
  userId,
  data,
  requestId,
  mimeType,
  ext,
  durationSeconds,
  liveTranscript,
  signal,
  onStage,
}: UploadArgs): Promise<{ id: string; status: GenerationStatus }> {
  onStage("uploading");
  const stableId = requestId ?? crypto.randomUUID();
  const filename =
    data instanceof File && data.name.trim() ? data.name : `${stableId}.${ext}`;

  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      filename,
      contentType: mimeType,
      fileSize: data.size,
      requestId: stableId,
    }),
  });
  const presign = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presign.error || "Could not prepare the upload.");
  }

  const r2Key = presign.key as string;
  if (!r2Key.startsWith(`${userId}/`)) {
    throw new Error("Upload was rejected because it was scoped incorrectly.");
  }

  const uploadRes = await fetch(presign.presignedUrl as string, {
    method: "PUT",
    body: data,
    headers: { "Content-Type": mimeType },
    signal,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload failed. Please try again.");
  }

  onStage("analyzing");
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      r2Key,
      mimeType,
      durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
      liveTranscript: liveTranscript || null,
    }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Something went wrong.");
  return {
    id: result.id as string,
    status:
      result.status === "processing" || result.status === "failed"
        ? result.status
        : "ready",
  };
}
