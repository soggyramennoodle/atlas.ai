"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import type {
  KeyConcept,
  NotePoint,
  NoteSection,
  StructuredNotes,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LearningOverlay, type LearningState } from "./learning-overlay";
import { SummaryCard } from "./summary-card";
import { TranscriptPanel } from "./transcript-panel";
import { SourceBullet } from "./source-bubble";
import { ConceptCard } from "./concept-card";

/** Coerce a bullet (old `string` shape or new `NotePoint`) to a NotePoint. */
function toPoint(p: NotePoint | string): NotePoint {
  return typeof p === "string" ? { text: p } : p;
}

/** Normalize a notes document so every bullet is a NotePoint (back-compat). */
function normalizeNotes(notes: StructuredNotes): StructuredNotes {
  return {
    ...notes,
    sections: (notes.sections ?? []).map((s) => ({
      ...s,
      points: (s.points ?? []).map(toPoint),
      subsections: (s.subsections ?? []).map((sub) => ({
        ...sub,
        points: (sub.points ?? []).map(toPoint),
      })),
    })),
    keyConcepts: notes.keyConcepts ?? [],
  };
}

const clone = <T,>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);

/**
 * Renderer + editor for a set of structured lecture notes. View mode mirrors
 * Gemini's output; edit mode (§3) turns every field into a Midnight-Luxe input
 * and, on save, persists the note and triggers the AI-memory animation (§2).
 */
export function NoteView({
  note,
}: {
  note: { id: string; content: StructuredNotes };
}) {
  const initial = useMemo(() => normalizeNotes(note.content), [note.content]);
  const [saved, setSaved] = useState<StructuredNotes>(initial);
  const [draft, setDraft] = useState<StructuredNotes>(() => clone(initial));
  const [editMode, setEditMode] = useState(false);
  const [savingState, setSaving] = useState(false);
  const [learning, setLearning] = useState<LearningState>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved]
  );

  function startEditing() {
    setDraft(clone(saved));
    setEditMode(true);
  }

  function discard() {
    if (dirty && !confirm("Discard your changes to these notes?")) return;
    setDraft(clone(saved));
    setEditMode(false);
  }

  async function save() {
    if (!dirty) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    const previous = saved; // pre-edit version, for the memory diff
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) throw new Error();
      setSaved(clone(draft));
      setEditMode(false);

      // §2: learn from the edits. Best-effort and non-blocking.
      setLearning("learning");
      void fetch("/api/memory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: note.id,
          original: previous,
          edited: draft,
        }),
      }).catch(() => {});
      // Hold the learning treatment ~2.5s, then a brief success state.
      window.setTimeout(() => setLearning("done"), 2500);
      window.setTimeout(() => setLearning(null), 3900);
    } catch {
      toast.error("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── field updaters (immutable) ──────────────────────────────────────────
  const update = (fn: (d: StructuredNotes) => void) =>
    setDraft((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });

  const shown = editMode ? draft : saved;

  return (
    <div className="relative">
      {/* Notes-section toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {editMode ? "Editing notes" : "Lecture notes"}
        </h2>
        {!editMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="gap-2"
          >
            <Pencil className="size-3.5" />
            Edit notes
          </Button>
        )}
      </div>

      <motion.article
        animate={{
          boxShadow: editMode
            ? "0 0 0 1px color-mix(in oklch, var(--primary) 45%, transparent)"
            : "0 0 0 0px transparent",
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative space-y-10 rounded-[1.5rem] transition",
          editMode && "bg-primary/[0.02] p-4 sm:p-6"
        )}
        style={{ filter: learning ? "blur(2px)" : "none" }}
      >
        {/* Summary */}
        {editMode ? (
          <section className="rounded-[1.5rem] border bg-primary/[0.04] p-6 sm:p-7">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Summary
            </h3>
            <Textarea
              value={draft.summary}
              onChange={(e) => update((d) => void (d.summary = e.target.value))}
              className="mt-3 min-h-24"
            />
          </section>
        ) : (
          <SummaryCard summary={saved.summary} />
        )}

        {/* Full transcript (view mode only, when present) */}
        {!editMode && saved.transcript?.trim() && (
          <TranscriptPanel transcript={saved.transcript} />
        )}

        {/* Detailed sections */}
        <div className="space-y-9">
          {shown.sections.map((section, i) => (
            <SectionBlock
              key={i}
              index={i}
              section={section}
              editMode={editMode}
              onHeading={(v) => update((d) => void (d.sections[i].heading = v))}
              onPoint={(j, v) =>
                update((d) => void (d.sections[i].points[j].text = v))
              }
              onSubHeading={(k, v) =>
                update((d) => void (d.sections[i].subsections![k].heading = v))
              }
              onSubPoint={(k, j, v) =>
                update(
                  (d) =>
                    void (d.sections[i].subsections![k].points[j].text = v)
                )
              }
            />
          ))}
        </div>

        {/* Key concepts */}
        {shown.keyConcepts.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold tracking-tight">Key concepts</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {shown.keyConcepts.map((concept, i) =>
                editMode ? (
                  <ConceptBlock
                    key={i}
                    concept={concept}
                    onTerm={(v) =>
                      update((d) => void (d.keyConcepts[i].term = v))
                    }
                    onDefinition={(v) =>
                      update((d) => void (d.keyConcepts[i].definition = v))
                    }
                  />
                ) : (
                  <ConceptCard
                    key={i}
                    concept={concept}
                    context={[saved.subject, saved.title]
                      .filter(Boolean)
                      .join(" — ")}
                  />
                )
              )}
            </dl>
          </section>
        )}

        <LearningOverlay state={learning} />
      </motion.article>

      {/* Floating save / discard bar */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl ring-luxe"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={discard}
              disabled={savingState}
              className="gap-1.5"
            >
              <X className="size-4" />
              Discard
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={savingState}
              className="gap-1.5"
            >
              {savingState ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save changes
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionBlock({
  index,
  section,
  editMode,
  onHeading,
  onPoint,
  onSubHeading,
  onSubPoint,
}: {
  index: number;
  section: NoteSection;
  editMode: boolean;
  onHeading: (v: string) => void;
  onPoint: (j: number, v: string) => void;
  onSubHeading: (k: number, v: string) => void;
  onSubPoint: (k: number, j: number, v: string) => void;
}) {
  return (
    <section className="scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          {(index + 1).toString().padStart(2, "0")}
        </span>
        {editMode ? (
          <Input
            value={section.heading}
            onChange={(e) => onHeading(e.target.value)}
            className="text-xl font-semibold"
          />
        ) : (
          <h3 className="text-xl font-semibold tracking-tight">
            {section.heading}
          </h3>
        )}
      </div>

      <ul className="mt-4 space-y-2.5">
        {section.points.map((point, j) => (
          <li key={j} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            {editMode ? (
              <Textarea
                value={point.text}
                onChange={(e) => onPoint(j, e.target.value)}
                className="min-h-16 flex-1"
              />
            ) : (
              <SourceBullet text={point.text} excerpt={point.source_excerpt} />
            )}
          </li>
        ))}
      </ul>

      {section.subsections?.map((sub, k) => (
        <div key={k} className="mt-5 border-l-2 border-border pl-5">
          {editMode ? (
            <Input
              value={sub.heading}
              onChange={(e) => onSubHeading(k, e.target.value)}
              className="font-medium"
            />
          ) : (
            <h4 className="font-medium tracking-tight">{sub.heading}</h4>
          )}
          <ul className="mt-2.5 space-y-2">
            {sub.points.map((point, j) => (
              <li
                key={j}
                className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                {editMode ? (
                  <Textarea
                    value={point.text}
                    onChange={(e) => onSubPoint(k, j, e.target.value)}
                    className="min-h-14 flex-1"
                  />
                ) : (
                  <SourceBullet text={point.text} excerpt={point.source_excerpt} />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Edit-mode inputs for a single key concept. */
function ConceptBlock({
  concept,
  onTerm,
  onDefinition,
}: {
  concept: KeyConcept;
  onTerm: (v: string) => void;
  onDefinition: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <Input
        value={concept.term}
        onChange={(e) => onTerm(e.target.value)}
        className="font-semibold"
      />
      <Textarea
        value={concept.definition}
        onChange={(e) => onDefinition(e.target.value)}
        className="mt-2 min-h-16"
      />
    </div>
  );
}
