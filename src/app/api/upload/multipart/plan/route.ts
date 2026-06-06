import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { UploadAuthError, assertJobSegmentUpload } from "@/lib/r2-upload-auth";
import { R2_MULTIPART_PART_BYTES, getR2Bucket, r2, requiredR2Env } from "@/lib/r2";

export const runtime = "nodejs";

interface PlanBody {
  jobId?: string;
  segmentIndex?: number;
  contentType?: string;
  fileSize?: number;
}

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  let body: PlanBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  const segmentIndex = body.segmentIndex;
  const contentType = body.contentType?.split(";")[0]?.trim().toLowerCase();
  const fileSize = body.fileSize;

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
  if (!fileSize || fileSize <= 0) {
    return NextResponse.json({ error: "Missing file size." }, { status: 400 });
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

    const partCount = Math.ceil(fileSize / R2_MULTIPART_PART_BYTES);
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_, index) => {
        const partNumber = index + 1;
        const presignedUrl = await getSignedUrl(
          r2,
          new UploadPartCommand({
            Bucket: getR2Bucket(),
            Key: key,
            UploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: 3600 }
        );
        return { partNumber, presignedUrl };
      })
    );

    return NextResponse.json({
      uploadId: UploadId,
      key,
      partSize: R2_MULTIPART_PART_BYTES,
      parts,
    });
  } catch (err) {
    if (err instanceof UploadAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
