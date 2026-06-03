import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderNotePdf } from "@/lib/exporters/pdf";
import { renderNoteDocx } from "@/lib/exporters/docx";
import type { ExportData } from "@/lib/exporters/shared";
import type { NoteRecord, UserProfile } from "@/lib/types";

export const runtime = "nodejs";

/** Filesystem-safe slug for the download filename. */
function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "notes"
  );
}

/** GET /api/notes/[id]/export?format=pdf|docx — download a note (§4). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json({ error: "Unsupported format." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // RLS scopes both reads to the signed-in user.
  const [{ data: noteRow }, { data: profileRow }] = await Promise.all([
    supabase.from("notes").select("*").eq("id", id).maybeSingle(),
    supabase.from("user_profiles").select("*").maybeSingle(),
  ]);

  const note = noteRow as NoteRecord | null;
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }
  const profile = profileRow as UserProfile | null;

  const data: ExportData = {
    lectureTitle: note.title,
    courseTitle: note.subject,
    dateLabel: new Date(note.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    studentName: profile?.display_name ?? user.email ?? null,
    notes: note.content,
  };

  try {
    if (format === "pdf") {
      const buf = await renderNotePdf(data);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug(note.title)}.pdf"`,
        },
      });
    }
    const buf = await renderNoteDocx(data);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug(note.title)}.docx"`,
      },
    });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json(
      { error: "Couldn't generate the export." },
      { status: 500 }
    );
  }
}
