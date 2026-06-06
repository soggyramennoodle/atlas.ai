"use client";

import { uploadSegment } from "@/lib/segment-upload";

/** Vercel Hobby request-body cap is ~4.5 MB; direct upload stays under it. */
export const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
/** Multipart parts are sent through the app server at this size. */
export const MULTIPART_CHUNK_BYTES = 3 * 1024 * 1024;

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function uploadLargeViaMultipart(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
  signal?: AbortSignal;
}): Promise<string> {
  const initRes = await fetch("/api/upload/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
      contentType: args.mime,
    }),
  });
  if (!initRes.ok) {
    throw new Error(await readError(initRes, "Could not prepare the upload."));
  }
  const { uploadId, key } = (await initRes.json()) as {
    uploadId: string;
    key: string;
  };

  const parts: { partNumber: number; etag: string }[] = [];
  const totalParts = Math.ceil(args.blob.size / MULTIPART_CHUNK_BYTES);

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const start = (partNumber - 1) * MULTIPART_CHUNK_BYTES;
    const end = Math.min(start + MULTIPART_CHUNK_BYTES, args.blob.size);
    const chunk = args.blob.slice(start, end);

    const partRes = await fetch("/api/upload/multipart/part", {
      method: "POST",
      headers: {
        "Content-Type": args.mime,
        "x-job-id": args.jobId,
        "x-segment-index": String(args.segmentIndex),
        "x-upload-id": uploadId,
        "x-part-number": String(partNumber),
      },
      body: chunk,
      signal: args.signal,
    });
    if (!partRes.ok) {
      throw new Error(await readError(partRes, "Upload failed. Please try again."));
    }
    const { etag } = (await partRes.json()) as { etag: string };
    parts.push({ partNumber, etag });
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
      parts,
      durationSeconds: args.durationSeconds ?? null,
    }),
  });
  if (!completeRes.ok) {
    throw new Error(await readError(completeRes, "Could not finish the upload."));
  }

  return key;
}

/**
 * Upload audio through the app server into R2. Avoids brittle browser PUT +
 * CORS to R2 (Safari "access control checks", presigned checksum 403s).
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
  return uploadLargeViaMultipart(args);
}
