"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type {
  KeyConcept,
  NotePoint,
  NoteSection,
  StructuredNotes,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notesBodyToHtml, sanitizeNoteHtml } from "@/lib/notes-html";
import { SummaryCard } from "./summary-card";
import { TranscriptPanel } from "./transcript-panel";
import { SourceBullet } from "./source-bubble";
import { KeyConceptsGrid } from "./concept-card";
import { RichNoteEditor } from "./rich-note-editor";

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

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type SaveStatus = "idle" | "saving" | "saved";

/**
 * Renderer + editor for a set of structured lecture notes. View mode mirrors
 * Gemini's output; edit mode (§1) turns the whole note body into one continuous
 * word-processor canvas, autosaving as you type with a quiet "Saved" indicator.
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
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [editorSeed, setEditorSeed] = useState("");

  const draftRef = useRef(draft);
  const originalRef = useRef<StructuredNotes>(initial);
  const savedRef = useRef(saved);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const update = (fn: (d: StructuredNotes) => void) =>
    setDraft((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });

  // ── persistence ──────────────────────────────────────────────────────────
  const persist = useCallback(async () => {
    const payload = clone(draftRef.current);
    if (same(payload, savedRef.current)) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: payload }),
      });
      if (!res.ok) throw new Error();
      setSaved(payload);
      setStatus("saved");
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(
        () => setStatus((s) => (s === "saved" ? "idle" : s)),
        2000
      );
    } catch {
      setStatus("idle");
      toast.error("Couldn't save your changes. Retrying as you type.");
    }
  }, [note.id]);

  // Debounced autosave whenever the draft drifts from what's saved.
  useEffect(() => {
    if (!editMode || same(draft, saved)) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 1100);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, saved, editMode, persist]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    []
  );

  /**
   * Persist a freshly regenerated summary. Works in both view and edit mode by
   * merging the new summary into whatever content is currently live (draft while
   * editing, saved otherwise) so neither body edits nor the new summary is lost.
   */
  const applyRegeneratedSummary = useCallback(
    (text: string) => {
      const base = clone(editMode ? draftRef.current : savedRef.current);
      base.summary = text;
      setSaved(base);
      setDraft(base);
      setStatus("saving");
      fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: base }),
      })
        .then((res) => {
          if (!res.ok) throw new Error();
          setStatus("saved");
          if (fadeTimer.current) clearTimeout(fadeTimer.current);
          fadeTimer.current = setTimeout(
            () => setStatus((s) => (s === "saved" ? "idle" : s)),
            2000
          );
        })
        .catch(() => {
          setStatus("idle");
          toast.error("Couldn't save the new summary.");
        });
    },
    [editMode, note.id]
  );

  function startEditing() {
    const base = clone(saved);
    setDraft(base);
    originalRef.current = clone(saved);
    setEditorSeed(saved.bodyHtml ?? notesBodyToHtml(saved));
    setEditMode(true);
  }

  async function done() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const edited = clone(draftRef.current);
    const changed = !same(edited, originalRef.current);
    if (!same(edited, savedRef.current)) await persist();
    setEditMode(false);

    // §1 carry-over of the old memory feature: learn from the edits, quietly.
    if (changed) {
      void fetch("/api/memory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: note.id,
          original: originalRef.current,
          edited,
        }),
      }).catch(() => {});
    }
  }

  const shown = editMode ? draft : saved;

  return (
    <div className="relative">
      {/* Notes-section toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {editMode ? "Editing notes" : "Lecture notes"}
        </h2>
        <div className="flex items-center gap-3">
          <AutosaveIndicator status={editMode ? status : "idle"} />
          {editMode ? (
            <Button size="sm" onClick={done} className="gap-2">
              <Check className="size-3.5" />
              Done
            </Button>
          ) : (
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
      </div>

      <article className="relative space-y-10">
        {/* Summary — read-only text with an AI "Regenerate" capsule. The
            summary is no longer hand-edited; it's re-derived from the full
            notes/transcript and streams back in. */}
        <SummaryCard
          noteId={note.id}
          summary={shown.summary}
          onRegenerated={applyRegeneratedSummary}
        />

        {/* Full transcript (view mode only, when present) */}
        {!editMode && saved.transcript?.trim() && (
          <TranscriptPanel transcript={saved.transcript} />
        )}

        {/* Note body — one continuous canvas in edit mode */}
        {editMode ? (
          <RichNoteEditor
            initialHtml={editorSeed}
            onChange={(html) => update((d) => void (d.bodyHtml = html))}
          />
        ) : saved.bodyHtml ? (
          <div
            className="note-prose"
            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(saved.bodyHtml) }}
          />
        ) : (
          <div className="space-y-9">
            {saved.sections.map((section, i) => (
              <SectionView key={i} index={i} section={section} />
            ))}
          </div>
        )}

        {/* Key concepts */}
        {shown.keyConcepts.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold tracking-tight">Key concepts</h3>
            <div className="mt-4">
              {editMode ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {draft.keyConcepts.map((concept, i) => (
                    <ConceptBlock
                      key={i}
                      concept={concept}
                      onTerm={(v) => update((d) => void (d.keyConcepts[i].term = v))}
                      onDefinition={(v) =>
                        update((d) => void (d.keyConcepts[i].definition = v))
                      }
                    />
                  ))}
                </div>
              ) : (
                <KeyConceptsGrid
                  concepts={saved.keyConcepts}
                  context={[saved.subject, saved.title]
                    .filter(Boolean)
                    .join(" — ")}
                />
              )}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

/** A small "Saved" pill that fades in after a save and out ~2s later (§1). */
function AutosaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <AnimatePresence>
      {status !== "idle" && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {status === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-400" />
              Saved
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Borderless textarea that grows with its content — used for the summary. */
function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className={className}
    />
  );
}

/** Read-only structured section (legacy notes without rich-text body). */
function SectionView({
  index,
  section,
}: {
  index: number;
  section: NoteSection;
}) {
  return (
    <section className="scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          {(index + 1).toString().padStart(2, "0")}
        </span>
        <h3 className="text-xl font-semibold tracking-tight">
          {section.heading}
        </h3>
      </div>

      <ul className="mt-4 space-y-2.5">
        {section.points.map((point, j) => (
          <li key={j} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <SourceBullet text={point.text} excerpt={point.source_excerpt} />
          </li>
        ))}
      </ul>

      {section.subsections?.map((sub, k) => (
        <div key={k} className="mt-5 border-l-2 border-border pl-5">
          <h4 className="font-medium tracking-tight">{sub.heading}</h4>
          <ul className="mt-2.5 space-y-2">
            {sub.points.map((point, j) => (
              <li
                key={j}
                className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                <SourceBullet text={point.text} excerpt={point.source_excerpt} />
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
      <AutoTextarea
        value={concept.definition}
        onChange={onDefinition}
        className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
