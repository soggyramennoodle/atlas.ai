import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function kickTick(request: Request) {
  const secret = [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .find((s): s is string => !!s);
  if (!secret) return;
  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, { method: "POST", headers: { "x-jobs-secret": secret } }).catch(() => {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const db = createAdminClient();

  const { data: job } = await db
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const stamp = new Date().toISOString();

  // Reset failed segments back into the queue (don't touch transcribed ones).
  await db
    .from("lecture_segments")
    .update({ status: "uploaded", attempts: 0, updated_at: stamp })
    .eq("job_id", id)
    .eq("status", "failed");

  await db
    .from("lecture_jobs")
    .update({ status: "recording_complete", error: null, heartbeat_at: null, updated_at: stamp })
    .eq("id", id);

  // A previously-failed job overwrote its note with a "Processing failed"
  // placeholder — reset it to processing so the user sees it working again.
  if (job.status === "failed" && job.note_id) {
    const { data: noteRow } = await db
      .from("notes")
      .select("content")
      .eq("id", job.note_id)
      .maybeSingle();
    const content = (noteRow?.content as Record<string, unknown> | null) ?? {};
    await db
      .from("notes")
      .update({
        title: "Processing…",
        content: { ...content, status: "processing", hold: null, title: "Processing…" },
      })
      .eq("id", job.note_id);
  }

  await kickTick(request);
  return NextResponse.json({ requeued: true });
}
