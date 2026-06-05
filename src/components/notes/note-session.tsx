"use client";

import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { CourseCapsule } from "@/components/notes/course-capsule";
import { NoteTitleEditor } from "@/components/notes/note-title-editor";
import { NoteView } from "@/components/notes/note-view";
import type { StructuredNotes } from "@/lib/types";

interface NoteSessionNote {
  id: string;
  title: string;
  subject: string | null;
  content: StructuredNotes;
  created_at: string;
}

export function NoteSession({
  note,
  created,
  duration,
}: {
  note: NoteSessionNote;
  created: string;
  duration: string | null;
}) {
  const [title, setTitle] = useState(note.title);

  return (
    <>
      <header className="mt-6">
        <CourseCapsule noteId={note.id} subject={note.subject} />
        <NoteTitleEditor
          noteId={note.id}
          title={title}
          onTitleChange={setTitle}
        />
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
          note={{
            id: note.id,
            title,
            content: note.content,
            createdAt: note.created_at,
          }}
        />
      </div>
    </>
  );
}
