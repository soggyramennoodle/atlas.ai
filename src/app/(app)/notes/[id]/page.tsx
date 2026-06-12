import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReportButton } from "@/components/feedback/report-dialog";
import { DeleteNoteButton, DownloadAudioButton, ExportMenu } from "@/components/notes/note-actions";
import { NoteSession } from "@/components/notes/note-session";
import { EnrichmentWatcher } from "@/components/notes/enrichment-watcher";
import { ProcessingWatcher } from "@/components/notes/processing-watcher";
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

  const processing = note.content?.status === "processing";
  const failed = note.content?.status === "failed";
  const enriching = note.content?.enrichment === "pending";

  return (
    <main className="px-4 pb-24 pt-10 lg:pt-16">
      {processing && <ProcessingWatcher noteId={note.id} />}
      {!processing && enriching && <EnrichmentWatcher noteId={note.id} />}
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full text-sm text-[#0d0d0d]/55 outline-none transition hover:-translate-x-0.5 hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
          >
            <ArrowLeft className="size-4" />
            Library
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <ReportButton
              context="note"
              noteId={note.id}
              noteTitle={note.title}
            />
            {failed && <DownloadAudioButton id={note.id} />}
            <ExportMenu id={note.id} />
            <DeleteNoteButton id={note.id} />
          </div>
        </div>

        <NoteSession
          note={{
            id: note.id,
            title: note.title,
            subject: note.subject,
            content: note.content,
            created_at: note.created_at,
          }}
          created={created}
          duration={duration}
        />
      </div>
    </main>
  );
}
