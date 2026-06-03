import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Clock, Mic, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NoteRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Your library" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(s: number | null) {
  if (!s) return null;
  const m = Math.round(s / 60);
  return `${m} min`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data } = await supabase
    .from("notes")
    .select("id, title, subject, audio_path, duration_seconds, created_at, content")
    .order("created_at", { ascending: false });

  const notes = (data ?? []) as Pick<
    NoteRecord,
    "id" | "title" | "subject" | "duration_seconds" | "created_at" | "content"
  >[];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 pb-20 pt-32">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your library
              </h1>
              <p className="mt-2 text-muted-foreground">
                {notes.length === 0
                  ? "Your lecture notes will appear here."
                  : `${notes.length} lecture${notes.length === 1 ? "" : "s"} noted.`}
              </p>
            </div>
            <Button asChild size="lg" className="group">
              <Link href="/upload">
                <Mic className="size-4" />
                Record a lecture
              </Link>
            </Button>
          </div>

          {notes.length === 0 ? (
            <div className="mt-12 grid place-items-center rounded-[1.75rem] border border-dashed bg-card px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-8" />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                No notes yet
              </h2>
              <p className="mt-2 max-w-sm text-muted-foreground text-pretty">
                Record your first lecture and Atlas will turn it into thorough,
                structured notes.
              </p>
              <Button asChild className="mt-6">
                <Link href="/upload">Record a lecture</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="group flex flex-col rounded-[1.5rem] border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="size-5" />
                    </span>
                    {note.subject && (
                      <Badge variant="secondary" className="font-normal">
                        {note.subject}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-semibold leading-snug tracking-tight">
                    {note.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {note.content?.summary}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(note.created_at)}</span>
                    {formatDuration(note.duration_seconds) && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(note.duration_seconds)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
