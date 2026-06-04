import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNotesFromAudio } from "@/lib/gemini";
import { buildMemoryContext } from "@/lib/memory";
import type { UserMemory, UserProfile, StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";
// Generating notes from a full lecture can take a while.
export const maxDuration = 300;

const BUCKET = "lectures";

interface ProcessBody {
  path?: string;
  mimeType?: string;
  durationSeconds?: number | null;
  /** Best-effort live transcript captured in-browser (§7). Fallback only. */
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

  let body: ProcessBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { path, mimeType, durationSeconds, liveTranscript } = body;
  if (!path || !mimeType) {
    return NextResponse.json(
      { error: "Missing audio path or mimeType." },
      { status: 400 }
    );
  }

  // Defence in depth: the uploaded object must live under the user's folder.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Download the audio the user uploaded to Storage (RLS scopes this to them).
  const { data: file, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (downloadError || !file) {
    return NextResponse.json(
      { error: "Could not read the uploaded recording." },
      { status: 404 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Personalization: pull the student's AI memory + profile (RLS-scoped to
  // them) and turn it into a context string for the system prompt (§2).
  const [{ data: memoryRow }, { data: profileRow }] = await Promise.all([
    supabase.from("user_memory").select("memory_blob").maybeSingle(),
    supabase.from("user_profiles").select("*").maybeSingle(),
  ]);
  const memoryContext = buildMemoryContext(
    (memoryRow?.memory_blob as UserMemory | undefined) ?? null,
    (profileRow as UserProfile | undefined) ?? null
  );

  let notes: StructuredNotes;
  try {
    notes = await generateNotesFromAudio({
      bytes,
      mimeType,
      memoryContext: memoryContext || undefined,
    });
  } catch (err) {
    console.error("Gemini note generation failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't generate notes from this recording. Please try again.",
      },
      { status: 502 }
    );
  }

  // Gemini's transcript is authoritative; fall back to the in-browser live
  // transcript only if the model returned nothing usable.
  if (!notes.transcript?.trim() && liveTranscript?.trim()) {
    notes.transcript = liveTranscript.trim();
  }

  const { data: inserted, error: insertError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: notes.title,
      subject: notes.subject || null,
      content: notes,
      audio_path: null,
      duration_seconds: durationSeconds ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("Failed to save note:", insertError);
    return NextResponse.json(
      { error: "Notes were generated but could not be saved." },
      { status: 500 }
    );
  }

  // Delete the raw recording immediately — Atlas Enclave guarantees audio is
  // never retained beyond the processing window.
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([path]);
  if (storageError) {
    console.error("Failed to delete recording after processing:", storageError);
  }

  return NextResponse.json({ id: inserted.id });
}
