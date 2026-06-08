"use client";

async function readError(res: Response, fallback: string) {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: string };
    return body.error || `${fallback} (HTTP ${res.status})`;
  } catch {
    const detail = text.trim().slice(0, 180);
    return detail
      ? `${fallback} (HTTP ${res.status}: ${detail})`
      : `${fallback} (HTTP ${res.status})`;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  signal?: AbortSignal;
}): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": args.mime,
    "x-job-id": args.jobId,
    "x-segment-index": String(args.segmentIndex),
  };
  if (args.durationSeconds != null) {
    headers["x-duration-seconds"] = String(Math.round(args.durationSeconds));
  }

  let lastError = "Segment upload failed.";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await wait(800 * attempt);

    const res = await fetch("/api/jobs/segment/upload", {
      method: "POST",
      headers,
      body: args.blob,
      signal: args.signal,
    });

    if (res.ok) {
      const { key } = (await res.json()) as { key: string };
      return key;
    }

    lastError = await readError(res, "Segment upload failed.");
    // Don't retry client errors — only transient server/network failures.
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      break;
    }
  }

  throw new Error(lastError);
}
