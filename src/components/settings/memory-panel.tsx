"use client";

import { useState } from "react";
import {
  Brain,
  BookOpen,
  Sparkles,
  Languages,
  SlidersHorizontal,
  History,
  GraduationCap,
  Type,
  Wand2,
  Send,
  Check,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CourseEntry, UserMemory, UserProfile } from "@/lib/types";

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

/** Client-side course label (mirrors lib/memory.courseLabel, which is server-only). */
function courseLabel(c: CourseEntry): string {
  const name = c.name?.trim() ?? "";
  const code = c.code?.trim();
  if (code && name) return `${code} — ${name}`;
  return code || name;
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
 * Chips here hold user/AI content of unbounded length (a concept, a full
 * formatting sentence), not short tags. Override the Badge primitive's
 * `whitespace-nowrap`/centering so long text wraps and breaks instead of
 * overflowing the card — on any screen size.
 */
const CHIP = "h-auto max-w-full justify-start whitespace-normal break-words text-left text-[0.8rem]";

/**
 * "What Atlas knows about you" — surfaces the per-user personalization that
 * drives note generation (the `user_memory` blob + profile). Students don't
 * edit fields directly; they correct Atlas conversationally via the refine box,
 * which rewrites the blob server-side.
 */
export function MemoryPanel({
  memory: initialMemory,
  profile,
  onEditProfile,
}: {
  memory: UserMemory | null;
  profile: UserProfile | null;
  onEditProfile?: () => void;
}) {
  const [memory, setMemory] = useState<UserMemory | null>(initialMemory);

  const courses = (memory?.courses ?? []).map(courseLabel).filter(Boolean);
  const subjects = clean(memory?.subjects, memory?.recurringCourses);
  const coursesAndSubjects = clean(courses, subjects);
  const concepts = clean(memory?.recurringConcepts);
  const terminology = clean(memory?.preferredTerminology);
  const content = clean(memory?.contentPreferences);
  // Legacy `stylePreferences` were mostly formatting; surface them as such.
  const formatting = clean(memory?.formattingPreferences, memory?.stylePreferences);
  const corrections = [...(memory?.corrections ?? [])].reverse().slice(0, 12);

  const who = clean([
    profile?.program ?? "",
    profile?.institution ?? "",
    profile?.year ?? "",
  ]);

  const hasLearned =
    coursesAndSubjects.length > 0 ||
    concepts.length > 0 ||
    terminology.length > 0 ||
    content.length > 0 ||
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
          As you record lectures and refine your notes, Atlas learns your
          courses, the concepts you study, and how deep you like your notes —
          then uses it to make every new set of notes fit you better.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          Private to you. Never shared with other students or used to train
          outside models.
        </p>
      </div>

      {/* Conversational correction */}
      <RefineBox memory={memory} onUpdated={setMemory} />

      {/* Who you are — sourced from profile */}
      <div className="rounded-[4px] border border-border bg-card p-6">
        <SectionHeader icon={GraduationCap} title="Who you are" />
        {who.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {who.map((w) => (
              <Badge key={w} variant="secondary" className={CHIP}>
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
            items={coursesAndSubjects}
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
          <ContentCard items={content} />
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

      {/* Formatting — deliberately separated from "what Atlas knows about you". */}
      {formatting.length > 0 && (
        <div className="rounded-[4px] border border-dashed border-border bg-card/60 p-5">
          <SectionHeader icon={Type} title="Note formatting" />
          <p className="mt-2 text-xs text-muted-foreground">
            How your notes are presented — not part of what Atlas learns about
            how you study.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {formatting.map((f) => (
              <Badge
                key={f}
                variant="ghost"
                className={`${CHIP} border-border text-muted-foreground`}
              >
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RefineBox({
  memory,
  onUpdated,
}: {
  memory: UserMemory | null;
  onUpdated: (m: UserMemory) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);

  async function submit() {
    const message = value.trim();
    if (!message || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/memory/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        summary?: string;
        memory?: UserMemory;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.memory) {
        throw new Error(data.error || "Couldn't apply that correction.");
      }
      onUpdated(data.memory);
      if (data.summary)
        setChanges((c) => [data.summary as string, ...c].slice(0, 4));
      setValue("");
      toast.success("Atlas updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't apply that correction."
      );
    } finally {
      setBusy(false);
    }
  }

  // `memory` is intentionally accepted so the box sits with the data it edits;
  // the server reads the authoritative blob, so we don't send it from here.
  void memory;

  return (
    <div className="rounded-[4px] border border-border bg-card p-6">
      <SectionHeader icon={Wand2} title="Correct what Atlas knows" />
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
        Something off? Tell Atlas in plain language — it&apos;ll adjust. You
        don&apos;t edit fields directly.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
        rows={3}
        maxLength={1000}
        placeholder="e.g. That’s just Biology, not a Cellular Reproduction course — the code is BIO 101."
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        className="mt-4 resize-none"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          ⌘/Ctrl + Enter to send
        </span>
        <Button
          onClick={submit}
          disabled={busy || !value.trim()}
          size="sm"
          className="ml-auto gap-1.5"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {busy ? "Applying…" : "Send to Atlas"}
        </Button>
      </div>

      {changes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {changes.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span className="text-pretty">{c}</span>
            </li>
          ))}
        </ul>
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
            <Badge key={item} variant="outline" className={CHIP}>
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

function ContentCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-[4px] border border-border bg-card p-5">
      <SectionHeader
        icon={SlidersHorizontal}
        title="How deep you like your notes"
      />
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Edit a set of notes — add an example, expand a derivation — and Atlas
          learns how much depth you want on the substance.
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  const willLearn = [
    "The courses and subjects you record",
    "Concepts and terminology you engage with",
    "How much depth you want in your notes",
    "The content fixes you make, so it stops repeating them",
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
