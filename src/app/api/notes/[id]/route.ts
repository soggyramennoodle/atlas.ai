import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";

interface PatchBody {
  /** The full edited StructuredNotes document to persist. */
  content?: StructuredNotes;
  /** Optional title/subject overrides (the capsule edits these directly). */
  title?: string;
  subject?: string | null;
}

/** Persist edits to a note owned by the current user (RLS-scoped). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.content) {
    if (!body.content.title || !Array.isArray(body.content.sections)) {
      return NextResponse.json(
        { error: "Edited notes are malformed." },
        { status: 400 }
      );
    }
    update.content = body.content;
    update.title = body.content.title;
    update.subject = body.content.subject || null;
  }
  if (typeof body.title === "string") update.title = body.title.trim();
  if (body.subject !== undefined) {
    update.subject = body.subject?.trim() ? body.subject.trim() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // RLS guarantees the update only touches a row the user owns.
  const { data, error } = await supabase
    .from("notes")
    .update(update)
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Couldn't save your changes." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}
