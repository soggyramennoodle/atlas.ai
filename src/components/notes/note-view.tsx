"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type {
  BodySource,
  KeyConcept,
  NotePoint,
  NoteSection,
  StructuredNotes,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { htmlToPlainText, notesBodyToHtml, sanitizeNoteHtml } from "@/lib/notes-html";
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
const PROCESSING_STALE_MS = 6 * 60_000;

/**
 * Renderer + editor for a set of structured lecture notes. View mode mirrors
 * Gemini's output; edit mode (§1) turns the whole note body into one continuous
 * word-processor canvas, autosaving as you type with a quiet "Saved" indicator.
 */
export function NoteView({
  note,
}: {
  note: { id: string; title: string; content: StructuredNotes; createdAt?: string };
}) {
  const initial = useMemo(
    () => normalizeNotes({ ...note.content, title: note.title }),
    [note.content, note.title]
  );
  const [saved, setSaved] = useState<StructuredNotes>(initial);
  const [draft, setDraft] = useState<StructuredNotes>(() => clone(initial));
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [editorSeed, setEditorSeed] = useState("");
  const [staleProcessing, setStaleProcessing] = useState(false);

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

  useEffect(() => {
    if (saved.status !== "processing" || !note.createdAt) return;

    const createdAtMs = new Date(note.createdAt).getTime();
    const remaining = PROCESSING_STALE_MS - (Date.now() - createdAtMs);
    const timer = window.setTimeout(
      () => setStaleProcessing(true),
      Math.max(0, remaining + 1000)
    );
    return () => window.clearTimeout(timer);
  }, [note.createdAt, saved.status]);

  const update = (fn: (d: StructuredNotes) => void) =>
    setDraft((prev) => {
      const next = clone(prev);
      fn(next);
      return next;
    });

  // ── persistence ──────────────────────────────────────────────────────────
  const persist = useCallback(async () => {
    const payload = clone(draftRef.current);
    payload.title = note.title;
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
  }, [note.id, note.title]);

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
      base.title = note.title;
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
    [editMode, note.id, note.title]
  );

  function startEditing() {
    const base = clone(saved);
    base.title = note.title;
    setDraft(base);
    originalRef.current = clone(base);
    setEditorSeed(saved.bodyHtml ?? notesBodyToHtml(saved));
    setEditMode(true);
  }

  const refreshBodySources = useCallback(async () => {
    const bodyHtml = draftRef.current.bodyHtml?.trim();
    if (!bodyHtml) return clone(draftRef.current);

    setStatus("saving");
    try {
      const res = await fetch(`/api/notes/${note.id}/sources`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { content?: StructuredNotes };
      if (!json.content) throw new Error();
      const next = normalizeNotes(json.content);
      setSaved(next);
      setDraft(next);
      savedRef.current = next;
      draftRef.current = next;
      setStatus("saved");
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(
        () => setStatus((s) => (s === "saved" ? "idle" : s)),
        2000
      );
      return next;
    } catch (err) {
      console.error("Source refresh failed:", err);
      setStatus("idle");
      return clone(draftRef.current);
    }
  }, [note.id]);

  async function done() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const edited = clone(draftRef.current);
    edited.title = note.title;
    const changed = !same(edited, originalRef.current);
    if (!same(edited, savedRef.current)) await persist();
    const sourced = changed ? await refreshBodySources() : edited;
    setEditMode(false);

    // §1 carry-over of the old memory feature: learn from the edits, quietly.
    if (changed) {
      void fetch("/api/memory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: note.id,
          original: originalRef.current,
          edited: sourced,
        }),
      }).catch(() => {});
    }
  }

  const shown = editMode
    ? { ...draft, title: note.title }
    : { ...saved, title: note.title };
  const displayStatus =
    staleProcessing && saved.status === "processing" ? "failed" : saved.status;

  if (displayStatus === "processing" || displayStatus === "failed") {
    return (
      <ProcessingNoteState
        failed={displayStatus === "failed"}
        message={
          staleProcessing
            ? "Atlas couldn't finish processing this recording. Try recording again or upload a shorter, clearer file."
            : saved.summary
        }
      />
    );
  }

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
          <EditedNoteBody html={saved.bodyHtml} sources={saved.bodySources ?? []} />
        ) : (
          <div className="space-y-9">
            {saved.sections.map((section, i) => (
              <SectionView key={i} index={i} section={section} />
            ))}
          </div>
        )}

        {/* Key concepts */}
        {(editMode || shown.keyConcepts.length > 0) && (
          <section>
            <h3 className="text-2xl font-bold tracking-[-0.02em]">Key concepts</h3>
            <div className="mt-4">
              {editMode ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {draft.keyConcepts.map((concept, i) => (
                      <ConceptBlock
                        key={i}
                        concept={concept}
                        onTerm={(v) => update((d) => void (d.keyConcepts[i].term = v))}
                        onDefinition={(v) =>
                          update((d) => void (d.keyConcepts[i].definition = v))
                        }
                        onRemove={() =>
                          update((d) => void d.keyConcepts.splice(i, 1))
                        }
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      update((d) =>
                        void d.keyConcepts.push({ term: "", definition: "" })
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-[4px] border border-dashed px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Plus className="size-4" />
                    Add concept
                  </button>
                </div>
              ) : (
                <KeyConceptsGrid
                  concepts={saved.keyConcepts}
                  context={[shown.subject, shown.title]
                    .filter(Boolean)
                    .join(", ")}
                />
              )}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

function ProcessingNoteState({
  failed,
  message,
}: {
  failed: boolean;
  message: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[4px] border border-border bg-card px-6 py-12 text-center">
      <span
        className={
          failed
            ? "relative mx-auto grid size-14 place-items-center rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive"
            : "relative mx-auto grid size-14 place-items-center rounded-[4px] border border-primary/30 bg-primary/10 text-primary"
        }
      >
        {failed ? (
          <AlertCircle className="size-6" />
        ) : (
          <Loader2 className="size-6 animate-spin" />
        )}
      </span>
      <h2 className="relative mt-5 text-3xl font-bold tracking-[-0.02em]">
        {failed ? "Processing failed" : "Still processing"}
      </h2>
      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function tagOf(node: Node): string {
  return node instanceof HTMLElement ? node.rawTagName?.toLowerCase() ?? "" : "";
}

function EditedNoteBody({
  html,
  sources,
}: {
  html: string;
  sources: BodySource[];
}) {
  const content = useMemo(() => {
    const sourceByIndex = new Map(sources.map((source) => [source.index, source]));
    const root = parse(sanitizeNoteHtml(html), { lowerCaseTagName: true });
    let listItemIndex = 0;

    const renderChildren = (nodes: Node[], keyPrefix: string, inListItem = false) =>
      nodes.map((node, index) =>
        renderNode(node, `${keyPrefix}-${index}`, inListItem)
      );

    const renderNode = (
      node: Node,
      key: string,
      inListItem = false
    ): React.ReactNode => {
      if (node.nodeType === NodeType.TEXT_NODE) return node.text;
      if (!(node instanceof HTMLElement)) return null;

      const tag = tagOf(node);
      if (tag === "br") return <br key={key} />;
      if (tag === "strong" || tag === "b") {
        return <strong key={key}>{renderChildren(node.childNodes, key, inListItem)}</strong>;
      }
      if (tag === "em" || tag === "i") {
        return <em key={key}>{renderChildren(node.childNodes, key, inListItem)}</em>;
      }
      if (tag === "u") {
        return <u key={key}>{renderChildren(node.childNodes, key, inListItem)}</u>;
      }
      if (tag === "h1" || tag === "h2") {
        return <h2 key={key}>{renderChildren(node.childNodes, key)}</h2>;
      }
      if (tag === "h3" || tag === "h4") {
        return <h3 key={key}>{renderChildren(node.childNodes, key)}</h3>;
      }
      if (tag === "p") {
        const children = renderChildren(node.childNodes, key, inListItem);
        return inListItem ? <span key={key}>{children}</span> : <p key={key}>{children}</p>;
      }
      if (tag === "ul") {
        return <ul key={key}>{renderChildren(node.childNodes, key)}</ul>;
      }
      if (tag === "ol") {
        return <ol key={key}>{renderChildren(node.childNodes, key)}</ol>;
      }
      if (tag === "li") {
        const currentIndex = listItemIndex;
        listItemIndex += 1;
        const source = sourceByIndex.get(currentIndex);
        const inlineNodes = node.childNodes.filter((child) => {
          const childTag = tagOf(child);
          return childTag !== "ul" && childTag !== "ol";
        });
        const nestedLists = node.childNodes.filter((child) => {
          const childTag = tagOf(child);
          return childTag === "ul" || childTag === "ol";
        });
        const text = htmlToPlainText(inlineNodes.map((child) => child.toString()).join(""));
        const sourceable =
          source?.source_excerpt && (source.status === "lecture" || source.status === "edited");
        const sourceStatus: "lecture" | "edited" =
          source?.status === "edited" ? "edited" : "lecture";

        return (
          <li key={key}>
            {sourceable ? (
              <SourceBullet
                text={text}
                excerpt={source.source_excerpt}
                status={sourceStatus}
              >
                {renderChildren(inlineNodes, `${key}-inline`, true)}
              </SourceBullet>
            ) : (
              renderChildren(inlineNodes, `${key}-inline`, true)
            )}
            {renderChildren(nestedLists, `${key}-nested`)}
          </li>
        );
      }

      return <p key={key}>{renderChildren(node.childNodes, key)}</p>;
    };

    return renderChildren(root.childNodes, "edited");
  }, [html, sources]);

  return <div className="note-prose">{content}</div>;
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
        <h3 className="text-2xl font-bold tracking-[-0.02em]">
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

/** Edit-mode inputs for a single key concept, with a remove control. */
function ConceptBlock({
  concept,
  onTerm,
  onDefinition,
  onRemove,
}: {
  concept: KeyConcept;
  onTerm: (v: string) => void;
  onDefinition: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group/concept hover-glow icon-animate relative rounded-[4px] border border-border bg-card p-5">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove concept"
        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-[4px] text-muted-foreground/70 opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 group-hover/concept:opacity-100 motion-reduce:opacity-100"
      >
        <X className="size-4" />
      </button>
      <Input
        value={concept.term}
        onChange={(e) => onTerm(e.target.value)}
        placeholder="Concept"
        className="pr-9 font-semibold"
      />
      <AutoTextarea
        value={concept.definition}
        onChange={onDefinition}
        placeholder="Definition"
        className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
