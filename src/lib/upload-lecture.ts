import type { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export const LECTURES_BUCKET = "lectures";
export const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — keep in sync with the bucket limit.

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

function uploadCanContinue(error: { message?: string; statusCode?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.statusCode === "409" ||
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("resource already exists")
  );
}

/**
 * Uploads a lecture recording to private Storage, then asks the server to
 * turn it into notes. Shared by the in-browser recorder and the file uploader.
 * Returns the new note id. Throws a user-readable Error on failure.
 */
export async function uploadLectureAndGenerate({
  supabase,
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
  const path = `${userId}/${stableId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LECTURES_BUCKET)
    .upload(path, data, { contentType: mimeType, upsert: false });

  if (uploadError && !uploadCanContinue(uploadError)) {
    throw new Error(
      uploadError.message.includes("exceeded")
        ? "The recording is larger than your storage bucket allows. Raise the bucket's file size limit in Supabase."
        : `Upload failed: ${uploadError.message}`
    );
  }

  onStage("analyzing");
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      path,
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
