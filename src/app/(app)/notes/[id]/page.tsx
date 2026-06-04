import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NoteView } from "@/components/notes/note-view";
import { DeleteNoteButton, ExportMenu } from "@/components/notes/note-actions";
import { CourseCapsule } from "@/components/notes/course-capsule";
import type { NoteRecord } from "@/lib/types";

async function getNote(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  return data as NoteRecord | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const note = await getNote(id);
  return { title: note?.title ?? "Notes" };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  const created = new Date(note.created_at).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const duration = note.duration_seconds
    ? `${Math.round(note.duration_seconds / 60)} min`
    : null;

  return (
    <main className="px-4 pb-24 pt-10 lg:pt-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:-translate-x-0.5 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Library
          </Link>
          <div className="flex items-center gap-1">
            <ExportMenu id={note.id} />
            <DeleteNoteButton id={note.id} />
          </div>
        </div>

        <header className="mt-6">
          <CourseCapsule noteId={note.id} subject={note.subject} />
          <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {note.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {created}
            </span>
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                {duration} lecture
              </span>
            )}
          </div>
        </header>

        <div className="mt-10">
          <NoteView
            note={{ id: note.id, content: note.content, createdAt: note.created_at }}
          />
        </div>
      </div>
    </main>
  );
}
