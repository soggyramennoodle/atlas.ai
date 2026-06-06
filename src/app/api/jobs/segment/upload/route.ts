import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { extForAudioContentType } from "@/lib/r2-audio";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Vercel Hobby request-body cap is ~4.5 MB; segments are ~5 min each. */
const MAX_SEGMENT_BYTES = 4 * 1024 * 1024;

/**
 * Upload one lecture segment through the app server (not a browser PUT to R2).
 * Avoids R2 CORS issues and registers the row in one round trip.
 */
export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const jobId = request.headers.get("x-job-id")?.trim();
  const segmentIndex = Number(request.headers.get("x-segment-index"));
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const durationHeader = request.headers.get("x-duration-seconds");
  const durationSeconds =
    durationHeader && Number.isFinite(Number(durationHeader))
      ? Math.round(Number(durationHeader))
      : null;

  if (!jobId || !Number.isInteger(segmentIndex) || segmentIndex < 0) {
    return NextResponse.json({ error: "Missing job or segment index." }, { status: 400 });
  }
  if (!contentType?.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio segments are supported." }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty audio segment." }, { status: 400 });
  }
  if (bytes.length > MAX_SEGMENT_BYTES) {
    return NextResponse.json(
      {
        error:
          "This segment is too large for a direct upload. Try a shorter recording or contact support.",
      },
      { status: 413 }
    );
  }

  const { data: job } = await supabase
    .from("lecture_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Unknown job." }, { status: 404 });

  const ext = extForAudioContentType(contentType);
  const key = `${user.id}/${jobId}/${segmentIndex}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );

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
}
