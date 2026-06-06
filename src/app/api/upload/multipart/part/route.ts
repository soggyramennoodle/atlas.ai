import { UploadPartCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { UploadAuthError, assertJobSegmentUpload } from "@/lib/r2-upload-auth";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Vercel Hobby request-body cap is ~4.5 MB; parts are sent at 3 MB. */
const MAX_PART_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const jobId = request.headers.get("x-job-id")?.trim();
  const segmentIndex = Number(request.headers.get("x-segment-index"));
  const uploadId = request.headers.get("x-upload-id")?.trim();
  const partNumber = Number(request.headers.get("x-part-number"));
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();

  if (!jobId || !Number.isInteger(segmentIndex) || segmentIndex < 0) {
    return NextResponse.json({ error: "Missing job or segment index." }, { status: 400 });
  }
  if (!uploadId) {
    return NextResponse.json({ error: "Missing upload id." }, { status: 400 });
  }
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    return NextResponse.json({ error: "Invalid part number." }, { status: 400 });
  }
  if (!contentType?.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio uploads are supported." }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty upload part." }, { status: 400 });
  }
  if (bytes.length > MAX_PART_BYTES) {
    return NextResponse.json({ error: "Upload part is too large." }, { status: 413 });
  }

  try {
    const { key } = await assertJobSegmentUpload({
      jobId,
      segmentIndex,
      contentType,
    });

    const { ETag } = await r2.send(
      new UploadPartCommand({
        Bucket: getR2Bucket(),
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: bytes,
      })
    );
    if (!ETag) {
      return NextResponse.json({ error: "Could not store upload part." }, { status: 500 });
    }

    return NextResponse.json({ etag: ETag, partNumber });
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
