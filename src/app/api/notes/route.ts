import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNotesFromAudio } from "@/lib/gemini";
import { buildMemoryContext } from "@/lib/memory";
import { getR2Bucket, r2, requiredR2Env } from "@/lib/r2";
import type { UserMemory, UserProfile, StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";
// Generating notes from a full lecture can take a while.
export const maxDuration = 300;

const PROCESSING_STALE_MS = 6 * 60_000;

interface ProcessBody {
  r2Key?: string;
  /** Back-compat for any clients still sending the old Supabase Storage path. */
  path?: string;
  mimeType?: string;
  durationSeconds?: number | null;
  /** Best-effort live transcript captured in-browser (§7). Fallback only. */
  liveTranscript?: string | null;
}

function processingContent(): StructuredNotes {
  return {
    status: "processing",
    title: "Processing lecture",
    subject: "",
    summary:
      "Atlas is still turning this recording into notes. You can leave this page and come back in a bit.",
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

function failedContent(message: string): StructuredNotes {
  return {
    status: "failed",
    title: "Processing failed",
    subject: "",
    summary: message,
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

function statusOf(content: unknown): StructuredNotes["status"] {
  if (!content || typeof content !== "object") return undefined;
  return (content as { status?: StructuredNotes["status"] }).status;
}

function isStaleProcessing(createdAt?: string | null) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() > PROCESSING_STALE_MS;
}

async function deleteR2Object(key: string) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key }));
  } catch (err) {
    console.error("Failed to delete R2 recording:", err);
  }
}

export async function POST(request: Request) {
  requiredR2Env("CLOUDFLARE_R2_ACCOUNT_ID");
  requiredR2Env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  requiredR2Env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");

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

  const { mimeType, durationSeconds, liveTranscript } = body;
  const r2Key = body.r2Key ?? body.path;
  if (!r2Key || !mimeType) {
    return NextResponse.json(
      { error: "Missing audio key or mimeType." },
      { status: 400 }
    );
  }

  // Defence in depth: the uploaded object must live under the user's folder.
  if (!r2Key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Idempotency and reload safety: a recording path is a generation job key.
  // If the browser reloads or retries while Gemini is still working, return the
  // existing note instead of starting another paid model call.
  const { data: existingNote } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .eq("audio_path", r2Key)
    .maybeSingle();

  if (existingNote?.id) {
    const status = statusOf(existingNote.content);
    if (status === "processing") {
      if (isStaleProcessing(existingNote.created_at)) {
        await supabase
          .from("notes")
          .update({
            title: "Processing failed",
            subject: null,
            content: failedContent(
              "Atlas couldn't finish processing this recording. Try recording again or upload a shorter, clearer file."
            ),
          })
          .eq("id", existingNote.id)
          .eq("user_id", user.id);
        await deleteR2Object(r2Key);
        return NextResponse.json({ id: existingNote.id, status: "failed" });
      }

      return NextResponse.json(
        { id: existingNote.id, status: "processing" },
        { status: 202 }
      );
    }

    await deleteR2Object(r2Key);
    return NextResponse.json({
      id: existingNote.id,
      status: status === "failed" ? "failed" : "ready",
    });
  }

  let bytes: Buffer;
  try {
    const { Body } = await r2.send(
      new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: r2Key,
      })
    );
    if (!Body) throw new Error("R2 object had no body.");
    bytes = Buffer.from(await Body.transformToByteArray());
  } catch (err) {
    console.error("Failed to download R2 recording:", err);
    return NextResponse.json(
      { error: "Could not read the uploaded recording." },
      { status: 404 }
    );
  }

  const { data: placeholder, error: placeholderError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: "Processing lecture",
      subject: null,
      content: processingContent(),
      audio_path: r2Key,
      duration_seconds: durationSeconds ?? null,
    })
    .select("id")
    .single();

  if (placeholderError || !placeholder) {
    // If the DB has the idempotency index applied, a racing duplicate insert
    // lands here. Re-read and return that existing job rather than generating.
    const { data: racedNote } = await supabase
      .from("notes")
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .eq("audio_path", r2Key)
      .maybeSingle();

    if (racedNote?.id) {
      const status = statusOf(racedNote.content);
      if (status === "processing" && isStaleProcessing(racedNote.created_at)) {
        await supabase
          .from("notes")
          .update({
            title: "Processing failed",
            subject: null,
            content: failedContent(
              "Atlas couldn't finish processing this recording. Try recording again or upload a shorter, clearer file."
            ),
          })
          .eq("id", racedNote.id)
          .eq("user_id", user.id);
        await deleteR2Object(r2Key);
        return NextResponse.json({ id: racedNote.id, status: "failed" });
      }

      return NextResponse.json(
        {
          id: racedNote.id,
          status:
            status === "processing"
              ? "processing"
              : status === "failed"
                ? "failed"
                : "ready",
        },
        { status: status === "processing" ? 202 : 200 }
      );
    }

    console.error("Failed to create note processing job:", placeholderError);
    return NextResponse.json(
      { error: "Could not start note processing." },
      { status: 500 }
    );
  }

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
    await supabase
      .from("notes")
      .update({
        title: "Processing failed",
        subject: null,
        content: failedContent(
          "Atlas couldn't generate notes from this recording. Try recording again or upload a clearer file."
        ),
      })
      .eq("id", placeholder.id)
      .eq("user_id", user.id);
    await deleteR2Object(r2Key);
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
  notes.status = "ready";

  const { data: updated, error: updateError } = await supabase
    .from("notes")
    .update({
      title: notes.title,
      subject: notes.subject || null,
      content: notes,
      audio_path: r2Key,
      duration_seconds: durationSeconds ?? null,
    })
    .eq("id", placeholder.id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    console.error("Failed to save note:", updateError);
    return NextResponse.json(
      { error: "Notes were generated but could not be saved." },
      { status: 500 }
    );
  }

  // Delete the raw recording immediately — Atlas Enclave guarantees audio is
  // never retained beyond the processing window.
  await deleteR2Object(r2Key);

  return NextResponse.json({ id: updated.id, status: "ready" });
}
