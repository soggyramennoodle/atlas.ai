"use client";

import { useState, type ComponentType, type CSSProperties } from "react";
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
import { CTA_WHITE, GLASS_DARK, GLASS_DARK_PILL } from "@/components/app/glass";
import { cn } from "@/lib/utils";
import type { CourseEntry, UserMemory, UserProfile } from "@/lib/types";

type IconType = ComponentType<{ className?: string }>;

/** Dark liquid-glass settings card. */
const CARD = cn(GLASS_DARK, "rounded-3xl");
/** Inline dark-glass secondary pill. */
const PILL_SECONDARY_INLINE = cn(
  GLASS_DARK_PILL,
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
);
/** White primary CTA (inline). */
const PILL_PRIMARY_INLINE = cn(CTA_WHITE, "h-12 px-6 text-sm");

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
  if (code && name) return `${code} - ${name}`;
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

const CHIP =
  "inline-flex min-h-8 max-w-full items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-left text-xs font-medium leading-5 text-white/70";

/**
 * "What Atlas knows about you" surfaces the per-user personalization that
 * drives note generation. Students correct Atlas conversationally through the
 * refine box, which rewrites the blob server-side.
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
    <div className="space-y-6 py-8">
      <section data-tour="settings-memory">
        <div className={cn(CARD, "relative isolate p-6 sm:p-8")}>
          <span
            aria-hidden
            className="processing-glow"
            style={{ "--ai-ring-flow": "11s" } as CSSProperties}
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
            <Brain className="size-3.5" />
            Atlas Memory
          </span>
          <h2 className="mt-5 max-w-3xl text-3xl font-normal tracking-[-0.01em] text-white">
            What Atlas has learned about how you study
          </h2>
          <p className="mt-3 max-w-3xl text-pretty text-sm leading-6 text-white/65">
            As you record lectures and refine notes, Atlas learns your courses,
            recurring concepts, and preferred depth so each new note starts
            closer to the way you study.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60">
            <Lock className="size-3.5" />
            Private to you. Never shared with other students.
          </p>
        </div>
      </section>

      <RefineBox memory={memory} onUpdated={setMemory} />

      <section className={cn(CARD, "p-6 sm:p-7")}>
        <SectionHeader icon={GraduationCap} title="Who you are" />
        {who.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {who.map((w) => (
              <span key={w} className={CHIP}>
                {w}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Tell Atlas your program and university so notes start tuned to your
            field.
          </p>
        )}
        <button
          type="button"
          onClick={onEditProfile}
          className={cn(PILL_SECONDARY_INLINE, "mt-5 h-10 px-4 text-xs")}
        >
          {who.length > 0 ? "Edit profile" : "Complete profile"}
          <ArrowRight className="size-3.5" />
        </button>
      </section>

      {!hasLearned ? (
        <EmptyState />
      ) : (
        <section className={cn(CARD, "space-y-8 p-6 sm:p-7")}>
          <ChipSection
            icon={BookOpen}
            title="Your courses and subjects"
            items={coursesAndSubjects}
          />
          <ChipSection
            icon={Sparkles}
            title="Concepts that keep coming up"
            items={concepts}
          />
          <ChipSection
            icon={Languages}
            title="Terminology you prefer"
            items={terminology}
          />
          <ContentSection items={content} />
        </section>
      )}

      {corrections.length > 0 && (
        <section className={cn(CARD, "p-6 sm:p-7")}>
          <SectionHeader
            icon={History}
            title="What your edits have taught Atlas"
          />
          <ol className="mt-5 space-y-4">
            {corrections.map((c, i) => {
              const date = formatDate(c.at);
              return (
                <li key={`${c.at}-${i}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
                    {date && <span>{date}</span>}
                    {c.noteTitle && (
                      <>
                        <span aria-hidden>/</span>
                        <span className="truncate">{c.noteTitle}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 max-w-3xl text-pretty text-sm leading-6 text-white/75">
                    {c.summary}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {formatting.length > 0 && (
        <section className={cn(CARD, "p-6 sm:p-7")}>
          <SectionHeader icon={Type} title="Note formatting" />
          <p className="mt-2 text-sm text-white/60">
            How your notes are presented.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {formatting.map((f) => (
              <span key={f} className={CHIP}>
                {f}
              </span>
            ))}
          </div>
        </section>
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

  // The server reads the authoritative blob, so this is colocated but not sent.
  void memory;

  return (
    <section className={cn(CARD, "p-6 sm:p-7")}>
      <SectionHeader icon={Wand2} title="Correct what Atlas knows" />
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
        Something off? Tell Atlas in plain language and it will adjust.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
        rows={4}
        maxLength={1000}
        placeholder="Tell Atlas what to fix or add: a course, a subject, a term, or how you like your notes."
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        className="mt-5 min-h-32 w-full resize-none rounded-2xl border border-white/20 bg-white/[0.04] px-5 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/40 focus:border-white/40 focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60"
      />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-white/55">
          Cmd/Ctrl + Enter to send
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className={cn(PILL_PRIMARY_INLINE, "h-10 px-4 text-xs")}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {busy ? "Applying..." : "Send to Atlas"}
        </button>
      </div>

      {changes.length > 0 && (
        <ul className="mt-5 space-y-1">
          {changes.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 py-2 text-sm leading-6 text-white/65"
            >
              <Check className="mt-1 size-4 shrink-0 text-emerald-500" />
              <span className="text-pretty">{c}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: IconType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white">
        <Icon className="size-4" />
      </span>
      <h3 className="text-base font-medium tracking-[-0.01em] text-white">
        {title}
      </h3>
    </div>
  );
}

function ChipSection({
  icon,
  title,
  items,
}: {
  icon: IconType;
  title: string;
  items: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)]">
      <SectionHeader icon={icon} title={title} />
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className={CHIP}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-white/60">
          Nothing here yet. This fills in as you use Atlas.
        </p>
      )}
    </div>
  );
}

function ContentSection({ items }: { items: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)]">
      <SectionHeader
        icon={SlidersHorizontal}
        title="How deep you like your notes"
      />
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-6 text-white/75"
            >
              <span
                aria-hidden
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-white/35"
              />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-white/60">
          Edit a set of notes, add an example, or expand a derivation, and Atlas
          learns how much depth you want.
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
    "The content fixes you make so Atlas stops repeating them",
  ];
  return (
    <section className={cn(CARD, "p-6 sm:p-7")}>
      <SectionHeader icon={Brain} title="Atlas is just getting to know you" />
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
        Record a lecture and tweak the generated notes. The more you use Atlas,
        the more this page fills in.
      </p>
      <ul className="mt-5 space-y-2.5">
        {willLearn.map((w) => (
          <li
            key={w}
            className="flex items-start gap-3 text-sm leading-6 text-white/75"
          >
            <Sparkles className="mt-1 size-4 shrink-0 text-white/55" />
            <span className="text-pretty">{w}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
