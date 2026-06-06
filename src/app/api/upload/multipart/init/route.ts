import {
  CreateMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { UploadAuthError, assertJobSegmentUpload } from "@/lib/r2-upload-auth";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";

export const runtime = "nodejs";

interface InitBody {
  jobId?: string;
  segmentIndex?: number;
  contentType?: string;
}

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  let body: InitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  const segmentIndex = body.segmentIndex;
  const contentType = body.contentType?.split(";")[0]?.trim().toLowerCase();
  if (
    !jobId ||
    segmentIndex == null ||
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 0
  ) {
    return NextResponse.json({ error: "Missing job or segment index." }, { status: 400 });
  }
  if (!contentType?.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio uploads are supported." }, { status: 400 });
  }

  try {
    const { key } = await assertJobSegmentUpload({
      jobId,
      segmentIndex,
      contentType,
    });

    const { UploadId } = await r2.send(
      new CreateMultipartUploadCommand({
        Bucket: getR2Bucket(),
        Key: key,
        ContentType: contentType,
      })
    );
    if (!UploadId) {
      return NextResponse.json({ error: "Could not start upload." }, { status: 500 });
    }

    return NextResponse.json({ uploadId: UploadId, key });
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
