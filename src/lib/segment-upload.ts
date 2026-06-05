"use client";

/**
 * Presign + PUT a single lecture segment to R2. Returns the R2 key on success.
 * Throws on any failure so the caller can keep the segment in the local draft
 * (uploaded: false) and retry later — the basis of cross-device durability.
 */
export async function uploadSegment(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
}): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: args.mime,
      fileSize: args.blob.size,
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
    }),
  });
  if (!presignRes.ok) throw new Error("Could not presign segment upload.");
  const { presignedUrl, key } = (await presignRes.json()) as {
    presignedUrl: string;
    key: string;
  };

  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    body: args.blob,
    headers: { "Content-Type": args.mime },
  });
  if (!putRes.ok) throw new Error("Segment upload failed.");
  return key;
}

/**
 * Register an uploaded segment as a row in lecture_segments via an
 * authenticated API route (the browser cannot write the table directly except
 * through RLS-checked inserts; this route does the insert server-side).
 */
export async function registerSegment(args: {
  jobId: string;
  segmentIndex: number;
  r2Key: string;
  durationSeconds: number | null;
}): Promise<void> {
  const res = await fetch("/api/jobs/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error("Could not register segment.");
}
