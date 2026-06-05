import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface EnqueueBody {
  jobId?: string;
  sessionLabel?: string;
  source?: "microphone" | "device";
}

/**
 * Called when recording STARTS. Creates the durable job row only — NOT a note.
 * Segments uploaded during recording need a job row to attach to, but a note is
 * deliberately withheld until the recording is completed (see /api/jobs/complete)
 * so a recording that's abandoned mid-session never leaves an orphaned
 * "processing" card on the dashboard. Idempotent on jobId.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: EnqueueBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }

  // Idempotency: if this job already exists, return it untouched.
  const { data: existing } = await supabase
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json(
      { jobId: existing.id, noteId: existing.note_id, status: existing.status },
      { status: 202 }
    );
  }

  const { error: jobErr } = await supabase.from("lecture_jobs").insert({
    id: jobId,
    user_id: user.id,
    status: "recording",
    source: body.source ?? "microphone",
    session_label: body.sessionLabel || "Untitled Lecture",
  });
  if (jobErr) {
    return NextResponse.json(
      { error: "Could not create the processing job." },
      { status: 500 }
    );
  }

  return NextResponse.json({ jobId, status: "recording" }, { status: 202 });
}
