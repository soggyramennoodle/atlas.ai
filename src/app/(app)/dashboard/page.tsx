import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, BookOpen, Clock, Loader2, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Greeting } from "@/components/dashboard/greeting";
import { StatCards, type Stat } from "@/components/dashboard/stat-cards";
import { QuickRecord } from "@/components/dashboard/quick-record";
import { Tips } from "@/components/dashboard/tips";
import { EmptyRecordings } from "@/components/dashboard/empty-state";
import type { NoteRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(s: number | null) {
  if (!s) return null;
  return `${Math.round(s / 60)} min`;
}

function displayStatus(note: Pick<NoteRecord, "content" | "created_at">) {
  return note.content?.status ?? "ready";
}

/** Consecutive days (ending today or yesterday) that have a recording. */
function computeStreak(dates: string[]): number {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  if (days.size === 0) return 0;
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  // Allow the streak to "hold" if the latest activity was yesterday.
  if (!days.has(new Date(cursor).toISOString().slice(0, 10))) {
    cursor -= dayMs;
    if (!days.has(new Date(cursor).toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= dayMs;
  }
  return streak;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("notes")
      .select(
        "id, title, subject, audio_path, duration_seconds, created_at, content"
      )
      .order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("*").maybeSingle(),
  ]);

  const notes = (data ?? []) as Pick<
    NoteRecord,
    "id" | "title" | "subject" | "duration_seconds" | "created_at" | "content"
  >[];

  const readyNotes = notes.filter((n) => displayStatus(n) === "ready");
  const totalSeconds = readyNotes.reduce(
    (sum, n) => sum + (n.duration_seconds ?? 0),
    0
  );
  const keyConcepts = readyNotes.reduce(
    (sum, n) => sum + (n.content?.keyConcepts?.length ?? 0),
    0
  );
  const streak = computeStreak(readyNotes.map((n) => n.created_at));

  const name =
    profile?.display_name?.trim() || (user.email ?? "there").split("@")[0];
  // Profile is "incomplete" if onboarding fields are missing (§5).
  const profileIncomplete =
    !profile?.display_name ||
    !profile?.institution ||
    !profile?.program ||
    !profile?.year ||
    !profile?.grad_year;

  const stats: Stat[] = [
    { icon: "mic", label: "Recordings", value: readyNotes.length },
    {
      icon: "clock",
      label: "Hours captured",
      value: totalSeconds / 3600,
      decimals: 1,
    },
    { icon: "sparkles", label: "Key concepts", value: keyConcepts },
    { icon: "flame", label: "Day streak", value: streak },
  ];

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Greeting name={name} />
            {profileIncomplete && (
              <Link
                href="/settings"
                className="group mt-3 inline-flex items-center gap-1 text-sm text-primary/90 transition hover:text-primary"
              >
                Complete your profile for a personalized experience
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            )}
          </div>
          <Button asChild size="lg" className="group shimmer shrink-0">
            <Link href="/upload">
              <Mic className="size-4" />
              Record a lecture
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8">
          <StatCards stats={stats} />
        </div>

        {/* Quick actions — the single quick-action entry point (§10). The
            empty state below provides the record CTA when the library is empty,
            so we avoid a third redundant button.
            TODO: Dynamic quick actions based on AI context (flashcard review,
            quiz practice, note review) */}
        {notes.length > 0 && (
          <div className="mt-6">
            <QuickRecord />
          </div>
        )}

        {/* Body: recordings + tips */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Recent recordings
              </h2>
              {notes.length > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  {notes.length} total
                </span>
              )}
            </div>

            {notes.length === 0 ? (
              <div className="mt-5">
                <EmptyRecordings />
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {notes.map((note) => {
                  const status = displayStatus(note);
                  const processing = status === "processing";
                  const failed = status === "failed";
                  return (
                    <Link
                      key={note.id}
                      href={`/notes/${note.id}`}
                      className="glow-card group flex flex-col rounded-2xl border bg-card/75 p-5 transition hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                          {failed ? (
                            <AlertCircle className="size-5 text-destructive" />
                          ) : processing ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <BookOpen className="size-5" />
                          )}
                        </span>
                        <span
                          className={
                            failed
                              ? "inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-destructive"
                              : processing
                                ? "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-primary"
                                : "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-emerald-400"
                          }
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {failed ? "Failed" : processing ? "Processing" : "Ready"}
                        </span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 font-semibold leading-snug tracking-tight">
                        {note.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
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
                        {note.subject && (
                          <Badge
                            variant="secondary"
                            className="ml-auto font-normal"
                          >
                            {note.subject}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <Tips />
          </aside>
        </div>
      </div>
    </main>
  );
}
