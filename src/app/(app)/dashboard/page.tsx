import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GLASS_CHIP, GlassPanel, HeroBand } from "@/components/app/glass";
import { Greeting } from "@/components/dashboard/greeting";
import { StatCards, type Stat } from "@/components/dashboard/stat-cards";
import { QuickRecord } from "@/components/dashboard/quick-record";
import { Tips } from "@/components/dashboard/tips";
import { EmptyRecordings } from "@/components/dashboard/empty-state";
import { DashboardStaleRefresh } from "@/components/dashboard/dashboard-stale-refresh";
import { RealtimeRefresh } from "@/components/dashboard/realtime-refresh";
import { NoteCard } from "@/components/dashboard/note-card";
import { Reveal } from "@/components/dashboard/reveal";
import type { NoteRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

// Reuse the last server render on client navigations so the dashboard paints
// instantly; DashboardStaleRefresh always revalidates in the background.
export const unstable_dynamicStaleTime = 300;

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

  const hasProcessing = notes.some((n) => displayStatus(n) === "processing");
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
  const hours = totalSeconds / 3600;

  const name =
    profile?.display_name?.trim() || (user.email ?? "there").split("@")[0];
  // Profile is "incomplete" if onboarding fields are missing (§5).
  const profileIncomplete =
    !profile?.display_name ||
    !profile?.institution ||
    !profile?.program ||
    !profile?.year ||
    !profile?.grad_year;

  // Hours headlines the ink chip in the hero band; the pill row carries the rest.
  const stats: Stat[] = [
    { icon: "mic", label: "recordings", value: readyNotes.length },
    { icon: "sparkles", label: "key concepts", value: keyConcepts },
    { icon: "flame", label: "day streak", value: streak },
  ];

  return (
    <main className="px-4 pb-24 pt-8 lg:px-12 lg:pt-14 2xl:px-16">
      <DashboardStaleRefresh />
      <RealtimeRefresh userId={user.id} hasProcessing={hasProcessing} />
      {/* Fills the area beside the sidebar (no centered cap) so the right side
          isn't left empty; the wider gutters above push it off the sidebar. */}
      <div>
        {/* Masthead: oversized editorial greeting straight on the canvas, with
            the mist imagery condensed into the glowing record tile beside it.
            Capped narrower than the library so the record tile sits beside the
            greeting instead of flying out to the far right edge. */}
        <div className="flex max-w-5xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <Greeting name={name} />
            {profileIncomplete && (
              <Link
                href="/settings"
                className="group mt-4 inline-flex items-center gap-1 text-sm text-[#0d0d0d]/60 transition hover:text-[#0d0d0d]"
              >
                Complete your profile for a personalized experience
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            {/* Stat strip lives in the masthead column so its bottom edge and
                the record tile's bottom edge sit on the same line (items-end). */}
            <div className="mt-8">
              <StatCards stats={stats} />
            </div>
          </div>

          {/* The record tile: a small window of light holding the session CTA. */}
          <HeroBand priority className="shrink-0 lg:w-80">
            <div className="p-3">
              <GlassPanel
                variant="ink"
                className="flex flex-col justify-between gap-6 px-6 py-5"
              >
                <div>
                  <p className="text-3xl font-normal tabular-nums tracking-tight sm:text-4xl">
                    {hours.toFixed(1)}
                    <span className="ml-1.5 text-base text-white/60">hrs</span>
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    of lectures{" "}
                    <span className="font-instrument italic">captured</span>
                  </p>
                </div>
                <Link
                  href="/upload"
                  className="group flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-[#0d0d0d] outline-none transition hover:scale-[1.02] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/50 motion-reduce:hover:scale-100"
                >
                  <Mic className="size-4" />
                  Record a lecture
                </Link>
              </GlassPanel>
            </div>
          </HeroBand>
        </div>

        {/* The library is the hero of this page. */}
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
              Your <span className="font-instrument italic">library</span>
            </h2>
            {notes.length > 0 && (
              <span className={`rounded-full px-2.5 py-1 text-xs tabular-nums text-[#0d0d0d]/55 ${GLASS_CHIP}`}>
                {notes.length} total
              </span>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="mt-6">
              <EmptyRecordings />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {notes.map((note, i) => (
                <Reveal
                  key={note.id}
                  index={i}
                  // The newest recording leads the library at double width.
                  className={i === 0 ? "sm:col-span-2" : undefined}
                >
                  <NoteCard
                    note={note}
                    status={displayStatus(note)}
                    held={note.content?.hold === "gemini_spend_cap"}
                    className="h-full"
                  />
                </Reveal>
              ))}
              <Reveal index={notes.length}>
                <QuickRecord />
              </Reveal>
            </div>
          )}
        </section>

        {/* Tips: a quiet strip at the foot of the page. */}
        <div className="mt-12">
          <Tips />
        </div>
      </div>
    </main>
  );
}
