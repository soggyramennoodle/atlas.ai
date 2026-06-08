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

    const partRes = await fetch(presignedUrl, {
      method: "PUT",
      body: chunk,
      signal: args.signal,
    });
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
  /** File-upload chunks bypass the app server and PUT straight to R2. */
  preferMultipart?: boolean;
}): Promise<string> {
  if (
    args.preferMultipart ||
    args.blob.size > DIRECT_UPLOAD_MAX_BYTES
  ) {
    return uploadLargeViaPresignedMultipart(args);
  }
  return uploadSegment(args);
}
