import type { createClient } from "@/lib/supabase/client";
import { uploadAudioViaServer } from "@/lib/server-audio-upload";

type SupabaseClient = ReturnType<typeof createClient>;

export const MAX_BYTES = 2 * 1024 * 1024 * 1024; // R2 presign endpoint enforces the same 2 GB app-level limit.

export type CaptureStage = "idle" | "preparing" | "uploading" | "analyzing";
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

/** Infer Gemini/R2 MIME from a storage key extension. */
export function mimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    webm: "audio/webm",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
    flac: "audio/flac",
  };
  return map[ext ?? ""] ?? "audio/mp4";
}

/**
 * Parse a JSON API response defensively. An empty or non-JSON body means the
 * server crashed, ran out of memory, timed out, or was killed mid-request
 * (common when a long/large recording exhausts the function's time or memory
 * budget) — and `Response.json()` would throw a cryptic "Unexpected end of JSON
 * input". Surface a clear, actionable error that includes the HTTP status so
 * the real cause is diagnosable from the message alone.
 */
async function parseJsonResponse(
  res: Response,
  context: string
): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      `${context} the server ended the request without a response (HTTP ${res.status}). A long recording can exceed the processing limit — try a shorter clip, or check the server logs.`
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${context} the server returned an unexpected response (HTTP ${res.status}). Please try again.`
    );
  }
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

async function postJson(
  url: string,
  body: Record<string, unknown>,
  context: string,
  signal?: AbortSignal
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(body),
  });
  const result = await parseJsonResponse(res, context);
  if (!res.ok) {
    throw new Error((result.error as string) || "Something went wrong.");
  }
  return result;
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
  durationSeconds,
  liveTranscript,
  signal,
  onStage,
}: UploadArgs): Promise<{ id: string; status: GenerationStatus }> {
  onStage("uploading");
  const stableId = requestId ?? crypto.randomUUID();
  const sessionLabel =
    data instanceof File && data.name.trim()
      ? data.name.replace(/\.[^.]+$/, "")
      : "Uploaded lecture";

  await postJson(
    "/api/jobs/enqueue",
    { jobId: stableId, sessionLabel, source: "microphone" },
    "Could not create the processing job —",
    signal
  );

  const r2Key = await uploadAudioViaServer({
    blob: data,
    mime: mimeType,
    jobId: stableId,
    segmentIndex: 0,
    durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
    signal,
  });
  if (!r2Key.startsWith(`${userId}/`)) {
    throw new Error("Upload was rejected because it was scoped incorrectly.");
  }

  onStage("analyzing");
  const result = await postJson(
    "/api/jobs/complete",
    {
      jobId: stableId,
      segmentCount: 1,
      durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
      liveTranscript: liveTranscript || null,
    },
    "Could not start note generation —",
    signal,
  );
  return {
    id: result.noteId as string,
    status: "processing",
  };
}
