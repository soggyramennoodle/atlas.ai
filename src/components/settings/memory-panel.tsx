"use client";

import {
  Brain,
  BookOpen,
  Sparkles,
  Languages,
  SlidersHorizontal,
  History,
  GraduationCap,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserMemory, UserProfile } from "@/lib/types";

/** De-dupe + trim a string list, dropping empties. */
function clean(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const v = raw?.trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

function formatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * "What Atlas knows about you" — surfaces the per-user personalization that
 * already drives note generation (the `user_memory` blob + profile). Read-only:
 * memory is learned from the student's edits, not hand-edited here.
 */
export function MemoryPanel({
  memory,
  profile,
  onEditProfile,
}: {
  memory: UserMemory | null;
  profile: UserProfile | null;
  onEditProfile?: () => void;
}) {
  const subjects = clean(memory?.subjects, memory?.recurringCourses);
  const concepts = clean(memory?.recurringConcepts);
  const terminology = clean(memory?.preferredTerminology);
  const style = clean(memory?.stylePreferences);
  const corrections = [...(memory?.corrections ?? [])]
    .reverse()
    .slice(0, 12);

  const who = clean([
    profile?.program ?? "",
    profile?.institution ?? "",
    profile?.year ?? "",
  ]);

  const hasLearned =
    subjects.length > 0 ||
    concepts.length > 0 ||
    terminology.length > 0 ||
    style.length > 0 ||
    corrections.length > 0;

  return (
    <div className="space-y-4">
      {/* Intro / reassurance */}
      <div className="ai-ring icon-animate relative isolate rounded-[4px] border border-border bg-card p-6">
        <span className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary">
          <Brain className="size-3.5" />
          Atlas Memory
        </span>
        <h2 className="mt-4 text-xl font-bold tracking-tight">
          What Atlas has learned about how you study
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          As you record lectures and refine your notes, Atlas quietly learns
          your courses, the terms you prefer, and how you like your notes
          written — then uses it to make every new set of notes sound more like
          yours.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          Private to you. Never shared with other students or used to train
          outside models.
        </p>
      </div>

      {/* Who you are — sourced from profile */}
      <div className="rounded-[4px] border border-border bg-card p-6">
        <SectionHeader icon={GraduationCap} title="Who you are" />
        {who.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {who.map((w) => (
              <Badge key={w} variant="secondary" className="text-[0.8rem]">
                {w}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Tell Atlas your program and university so notes start out tuned to
            your field.
          </p>
        )}
        <button
          onClick={onEditProfile}
          className="group mt-4 inline-flex items-center gap-1 text-sm text-primary/90 transition hover:text-primary"
        >
          {who.length > 0 ? "Edit in Profile" : "Complete your profile"}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {!hasLearned ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ChipCard
            icon={BookOpen}
            title="Your courses & subjects"
            items={subjects}
          />
          <ChipCard
            icon={Sparkles}
            title="Concepts that keep coming up"
            items={concepts}
          />
          <ChipCard
            icon={Languages}
            title="Terminology you prefer"
            items={terminology}
          />
          <StyleCard items={style} />
        </div>
      )}

      {corrections.length > 0 && (
        <div className="rounded-[4px] border border-border bg-card p-6">
          <SectionHeader
            icon={History}
            title="What your edits have taught Atlas"
          />
          <ol className="mt-4 space-y-3">
            {corrections.map((c, i) => {
              const date = formatDate(c.at);
              return (
                <li
                  key={`${c.at}-${i}`}
                  className="rounded-[4px] border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {date && <span className="font-mono">{date}</span>}
                    {c.noteTitle && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate">{c.noteTitle}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 text-pretty">
                    {c.summary}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof BookOpen;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-border bg-background text-foreground">
        <Icon className="size-4" />
      </span>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function ChipCard({
  icon,
  title,
  items,
}: {
  icon: typeof BookOpen;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[4px] border border-border bg-card p-5">
      <SectionHeader icon={icon} title={title} />
      {items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline" className="text-[0.8rem]">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing here yet — this fills in as you use Atlas.
        </p>
      )}
    </div>
  );
}

function StyleCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-[4px] border border-border bg-card p-5">
      <SectionHeader icon={SlidersHorizontal} title="How you like your notes" />
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Edit a set of notes and Atlas will pick up on your style — shorter
          bullets, more formulas, whatever you reach for.
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  const willLearn = [
    "The courses and subjects you record",
    "Terms and notation you prefer",
    "How much detail you like in your notes",
    "The fixes you make, so it stops repeating them",
  ];
  return (
    <div className="rounded-[4px] border border-dashed border-border bg-card p-6">
      <SectionHeader icon={Brain} title="Atlas is just getting to know you" />
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
        Record a lecture and tweak the notes Atlas generates. The more you use
        it, the more this page fills in. Here&apos;s what it will pick up:
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {willLearn.map((w) => (
          <li
            key={w}
            className="flex items-start gap-2 rounded-[4px] border border-border bg-background p-3 text-sm text-foreground/90"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-pretty">{w}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
