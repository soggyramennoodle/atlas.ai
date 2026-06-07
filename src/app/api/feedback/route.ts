import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CATEGORIES = ["inaccurate", "wrong", "other"] as const;

/** Store user feedback about a note or the app in general. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = body.category;
  if (
    typeof category !== "string" ||
    !CATEGORIES.includes(category as (typeof CATEGORIES)[number])
  ) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, 4000)
      : null;

  const pagePath =
    typeof body.pagePath === "string" && body.pagePath.trim()
      ? body.pagePath.trim().slice(0, 500)
      : null;

  let noteId: string | null = null;
  if (body.noteId != null) {
    if (typeof body.noteId !== "string") {
      return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
    }
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id")
      .eq("id", body.noteId)
      .maybeSingle();
    if (noteError || !note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    noteId = note.id;
  }

  const { error } = await supabase.from("user_feedback").insert({
    user_id: user.id,
    note_id: noteId,
    category,
    message,
    page_path: pagePath,
  });

  if (error) {
    console.error("Feedback insert failed:", error);
    return NextResponse.json(
      { error: "Couldn't save your report." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
