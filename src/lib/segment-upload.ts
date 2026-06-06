"use client";

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Upload a lecture segment through the app server, which stores it in R2 and
 * registers the lecture_segments row. Avoids brittle browser PUT + CORS to R2.
 */
export async function uploadSegment(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
  durationSeconds?: number | null;
}): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": args.mime,
    "x-job-id": args.jobId,
    "x-segment-index": String(args.segmentIndex),
  };
  if (args.durationSeconds != null) {
    headers["x-duration-seconds"] = String(Math.round(args.durationSeconds));
  }

  const res = await fetch("/api/jobs/segment/upload", {
    method: "POST",
    headers,
    body: args.blob,
  });
  if (!res.ok) {
    throw new Error(await readError(res, "Segment upload failed."));
  }
  const { key } = (await res.json()) as { key: string };
  return key;
}
