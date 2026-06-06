import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { UploadAuthError, assertJobSegmentUpload } from "@/lib/r2-upload-auth";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";

export const runtime = "nodejs";

interface PartEntry {
  partNumber?: number;
  etag?: string;
}

interface CompleteBody {
  jobId?: string;
  segmentIndex?: number;
  contentType?: string;
  uploadId?: string;
  parts?: PartEntry[];
  durationSeconds?: number | null;
}

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  let body: CompleteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  const segmentIndex = body.segmentIndex;
  const uploadId = body.uploadId?.trim();
  const contentType = body.contentType?.split(";")[0]?.trim().toLowerCase();
  const parts = body.parts ?? [];

  if (
    !jobId ||
    segmentIndex == null ||
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 0
  ) {
    return NextResponse.json({ error: "Missing job or segment index." }, { status: 400 });
  }
  if (!uploadId) {
    return NextResponse.json({ error: "Missing upload id." }, { status: 400 });
  }
  if (!contentType?.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio uploads are supported." }, { status: 400 });
  }
  if (parts.length === 0) {
    return NextResponse.json({ error: "No upload parts provided." }, { status: 400 });
  }

  const normalizedParts = parts
    .map((part) => ({
      PartNumber: part.partNumber,
      ETag: part.etag,
    }))
    .filter(
      (part): part is { PartNumber: number; ETag: string } =>
        Number.isInteger(part.PartNumber) &&
        (part.PartNumber as number) >= 1 &&
        typeof part.ETag === "string" &&
        part.ETag.length > 0
    )
    .sort((a, b) => a.PartNumber - b.PartNumber);

  if (normalizedParts.length !== parts.length) {
    return NextResponse.json({ error: "Invalid upload parts." }, { status: 400 });
  }

  try {
    const { supabase, key } = await assertJobSegmentUpload({
      jobId,
      segmentIndex,
      contentType,
    });

    await r2.send(
      new CompleteMultipartUploadCommand({
        Bucket: getR2Bucket(),
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: normalizedParts },
      })
    );

    const durationSeconds =
      body.durationSeconds != null && Number.isFinite(body.durationSeconds)
        ? Math.round(body.durationSeconds)
        : null;

    const { error } = await supabase.from("lecture_segments").upsert(
      {
        job_id: jobId,
        index: segmentIndex,
        r2_key: key,
        status: "uploaded",
        duration_seconds: durationSeconds,
      },
      { onConflict: "job_id,index" }
    );
    if (error) {
      return NextResponse.json({ error: "Could not register segment." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Multipart complete failed:", err);
    return NextResponse.json(
      { error: "Could not finish the upload. Please try again." },
      { status: 500 }
    );
  }
}
