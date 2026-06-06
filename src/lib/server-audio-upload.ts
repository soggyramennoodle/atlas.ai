"use client";

import { uploadSegment } from "@/lib/segment-upload";

/** Vercel Hobby request-body cap is ~4.5 MB; direct upload stays under it. */
export const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Large files go straight to R2 via a presigned PUT. Server-side multipart
 * can't work here: R2 requires ≥5 MB parts but Vercel caps request bodies at
 * ~4.5 MB. The checksum fix in src/lib/r2.ts keeps presigned PUTs from 403ing.
 */
async function uploadLargeViaPresign(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
  signal?: AbortSignal;
}): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      contentType: args.mime,
      fileSize: args.blob.size,
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
    }),
  });
  if (!presignRes.ok) {
    throw new Error(await readError(presignRes, "Could not prepare the upload."));
  }
  const { presignedUrl, key } = (await presignRes.json()) as {
    presignedUrl: string;
    key: string;
  };

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    body: args.blob,
    headers: { "Content-Type": args.mime },
    signal: args.signal,
  });
  if (!uploadRes.ok) {
    throw new Error("Upload failed. Please try again.");
  }

  const registerRes = await fetch("/api/jobs/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
      r2Key: key,
      durationSeconds: args.durationSeconds ?? null,
    }),
  });
  if (!registerRes.ok) {
    throw new Error(await readError(registerRes, "Could not register the uploaded audio."));
  }

  return key;
}

/**
 * Upload audio into R2. Small files go through the app server (no CORS). Larger
 * files use a presigned PUT to R2 (checksum-safe; see src/lib/r2.ts).
 */
export async function uploadAudioViaServer(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
  signal?: AbortSignal;
}): Promise<string> {
  if (args.blob.size <= DIRECT_UPLOAD_MAX_BYTES) {
    return uploadSegment(args);
  }
  return uploadLargeViaPresign(args);
}
