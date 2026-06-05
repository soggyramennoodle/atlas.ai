import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

interface PresignBody {
  filename?: string;
  contentType?: string;
  fileSize?: number;
  requestId?: string;
  /** Durable-job uploads: scope the key to a job + segment index. */
  jobId?: string;
  segmentIndex?: number;
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "lecture";
}

function extensionForContentType(contentType: string) {
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
  return map[contentType] ?? "audio";
}

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: PresignBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const contentType = body.contentType?.split(";")[0]?.trim().toLowerCase();
  if (!contentType?.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio uploads are supported." }, { status: 400 });
  }

  if (!body.fileSize || body.fileSize <= 0 || body.fileSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Upload must be a non-empty audio file under 2 GB." },
      { status: 400 }
    );
  }

  const filename = body.filename?.trim()
    ? safeFilename(body.filename)
    : `lecture.${extensionForContentType(contentType)}`;
  const requestId = body.requestId?.trim() || crypto.randomUUID();
  // Durable-job segment uploads land at a stable, job-scoped key so the worker
  // (and recovery) can find each segment deterministically.
  const isSegment =
    typeof body.jobId === "string" &&
    body.jobId.trim().length > 0 &&
    Number.isInteger(body.segmentIndex);
  const key = isSegment
    ? `${user.id}/${body.jobId!.trim()}/${body.segmentIndex}.${extensionForContentType(contentType)}`
    : `${user.id}/${requestId}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

  return NextResponse.json({ presignedUrl, key });
}
