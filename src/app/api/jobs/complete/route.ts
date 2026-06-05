import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string; segmentCount?: number; durationSeconds?: number | null; liveTranscript?: string | null;
  };
  if (!body.jobId || !Number.isInteger(body.segmentCount)) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  const { error } = await supabase
    .from("lecture_jobs")
    .update({
      status: "recording_complete",
      segment_count: body.segmentCount,
      total_seconds: body.durationSeconds ?? null,
      live_transcript: body.liveTranscript ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.jobId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not complete job." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
