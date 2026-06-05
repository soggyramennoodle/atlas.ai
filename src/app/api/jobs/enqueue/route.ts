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

interface EnqueueBody {
  jobId?: string;
  sessionLabel?: string;
  source?: "microphone" | "device";
  durationSeconds?: number | null;
  liveTranscript?: string | null;
}

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

  // Idempotency: if this job already exists, return its note.
  const { data: existing } = await supabase
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.note_id) {
    return NextResponse.json(
      { jobId: existing.id, noteId: existing.note_id, status: existing.status },
      { status: 202 }
    );
  }

  // Create the placeholder note first so the dashboard shows it immediately.
  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: "Processing lecture",
      subject: null,
      content: processingContent(),
      audio_path: jobId,
      duration_seconds: body.durationSeconds ?? null,
    })
    .select("id")
    .single();
  if (noteErr || !note) {
    return NextResponse.json(
      { error: "Could not start note processing." },
      { status: 500 }
    );
  }

  const { error: jobErr } = await supabase.from("lecture_jobs").insert({
    id: jobId,
    user_id: user.id,
    note_id: note.id,
    status: "recording",
    source: body.source ?? "microphone",
    session_label: body.sessionLabel || "Untitled Lecture",
    total_seconds: body.durationSeconds ?? null,
    live_transcript: body.liveTranscript ?? null,
  });
  if (jobErr) {
    return NextResponse.json(
      { error: "Could not create the processing job." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { jobId, noteId: note.id, status: "recording" },
    { status: 202 }
  );
}
