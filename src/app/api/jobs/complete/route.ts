import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";

function processingContent(): StructuredNotes {
  return {
    status: "processing",
    title: "Processing lecture",
    subject: "",
    summary:
      "Atlas is turning this recording into notes. You can close this tab — your notes will appear in your dashboard on any device.",
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

interface CompleteBody {
  jobId?: string;
  segmentCount?: number;
  durationSeconds?: number | null;
  liveTranscript?: string | null;
}

function workerSecret() {
  return (process.env.JOBS_TICK_SECRET || process.env.CRON_SECRET || "").trim();
}

function kickWorker(request: Request) {
  const secret = workerSecret();
  if (!secret) return;

  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, {
    method: "POST",
    headers: { "x-jobs-secret": secret },
    body: "{}",
  }).catch(() => {});
}

/**
 * Called when recording STOPS. Now that there is something to process, this
 * creates the placeholder "processing" note (so it appears on the dashboard on
 * any device), links it to the job, and flips the job to `recording_complete`
 * so the worker will pick it up. Idempotent: re-calling returns the same note.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as CompleteBody;
  if (!body.jobId || !Number.isInteger(body.segmentCount)) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const { data: job } = await supabase
    .from("lecture_jobs")
    .select("id, note_id")
    .eq("id", body.jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Unknown job." }, { status: 404 });

  // Create the placeholder note once (idempotent on re-complete).
  let noteId = job.note_id as string | null;
  if (!noteId) {
    const { data: note, error: noteErr } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Processing lecture",
        subject: null,
        content: processingContent(),
        audio_path: body.jobId,
        duration_seconds: body.durationSeconds ?? null,
      })
      .select("id")
      .single();
    if (noteErr || !note) {
      return NextResponse.json({ error: "Could not create the note." }, { status: 500 });
    }
    noteId = note.id;
  }

  const { error } = await supabase
    .from("lecture_jobs")
    .update({
      status: "recording_complete",
      note_id: noteId,
      segment_count: body.segmentCount,
      total_seconds: body.durationSeconds ?? null,
      live_transcript: body.liveTranscript ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.jobId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not complete job." }, { status: 500 });

  kickWorker(request);

  return NextResponse.json({ ok: true, noteId, status: "recording_complete" });
}
