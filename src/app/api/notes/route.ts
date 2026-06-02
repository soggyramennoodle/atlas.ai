import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNotesFromAudio } from "@/lib/gemini";

export const runtime = "nodejs";
// Generating notes from a full lecture can take a while.
export const maxDuration = 300;

const BUCKET = "lectures";

interface ProcessBody {
  path?: string;
  mimeType?: string;
  durationSeconds?: number | null;
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

  const { path, mimeType, durationSeconds } = body;
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

  let notes;
  try {
    notes = await generateNotesFromAudio({ bytes, mimeType });
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

  const { data: inserted, error: insertError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: notes.title,
      subject: notes.subject || null,
      content: notes,
      audio_path: path,
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

  return NextResponse.json({ id: inserted.id });
}
