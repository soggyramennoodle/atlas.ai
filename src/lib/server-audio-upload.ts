"use client";

import { uploadSegment } from "@/lib/segment-upload";

/** Vercel Hobby request-body cap is ~4.5 MB; stay under it with headroom. */
export const DIRECT_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;
/** Must match R2 minimum multipart part size in src/lib/r2.ts. */
export const MULTIPART_PART_BYTES = 5 * 1024 * 1024;

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Large files upload in ≥5 MB parts via presigned UploadPart URLs straight to
 * R2. The app server never buffers the bytes (Vercel's 4.5 MB cap) and we avoid
 * single PutObject presigned PUT quirks in Safari.
 */
async function uploadLargeViaPresignedMultipart(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
  signal?: AbortSignal;
}): Promise<string> {
  const planRes = await fetch("/api/upload/multipart/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
      contentType: args.mime,
      fileSize: args.blob.size,
    }),
  });
  if (!planRes.ok) {
    throw new Error(await readError(planRes, "Could not prepare the upload."));
  }

  const { uploadId, key, partSize, parts } = (await planRes.json()) as {
    uploadId: string;
    key: string;
    partSize: number;
    parts: { partNumber: number; presignedUrl: string }[];
  };

  const uploadedParts: { partNumber: number; etag: string }[] = [];

  for (const { partNumber, presignedUrl } of parts) {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, args.blob.size);
    const chunk = args.blob.slice(start, end);

    let partRes: Response;
    try {
      partRes = await fetch(presignedUrl, {
        method: "PUT",
        body: chunk,
        signal: args.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/load failed|failed to fetch|networkerror/i.test(msg)) {
        throw new Error(
          "Upload to storage was blocked by the browser (usually a network or CORS issue). Please try again, or contact support if it keeps failing."
        );
      }
      throw err;
    }
    if (!partRes.ok) {
      throw new Error(
        `Upload failed (part ${partNumber}, HTTP ${partRes.status}). Please try again.`
      );
    }

    const etag = partRes.headers.get("ETag") ?? partRes.headers.get("etag");
    if (!etag) {
      throw new Error(
        "Upload failed because the storage response did not include a part tag. Check R2 CORS exposes ETag."
      );
    }
    uploadedParts.push({ partNumber, etag });
  }

  const completeRes = await fetch("/api/upload/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
      contentType: args.mime,
      uploadId,
      parts: uploadedParts,
      durationSeconds: args.durationSeconds ?? null,
    }),
  });
  if (!completeRes.ok) {
    throw new Error(await readError(completeRes, "Could not finish the upload."));
  }

  return key;
}

/**
 * Upload audio into R2. Small files go through the app server (no CORS). Larger
 * files use presigned multipart PUTs to R2 (5 MB parts).
 */
export async function uploadAudioViaServer(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
  signal?: AbortSignal;
  /** Force browser PUTs to R2 even when the segment fits through the app server. */
  preferMultipart?: boolean;
}): Promise<string> {
  if (args.preferMultipart || args.blob.size > DIRECT_UPLOAD_MAX_BYTES) {
    return uploadLargeViaPresignedMultipart(args);
  }
  try {
    return await uploadSegment(args);
  } catch (err) {
    // Server route returns 413 when a segment exceeds the Vercel body cap.
    if (
      err instanceof Error &&
      /too large for a direct upload|HTTP 413/i.test(err.message)
    ) {
      return uploadLargeViaPresignedMultipart(args);
    }
    throw err;
  }
}
