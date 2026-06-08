"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { AlertCircle, Check, Loader2, Pencil, Plus, Sparkles, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

const normText = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Pull the visible block texts (list items, paragraphs, headings) from note HTML. */
function blockTexts(html?: string): string[] {
  if (!html || typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("li, p, h1, h2, h3, h4"))
    .map((el) => el.textContent ?? "")
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

/** Text blocks present in the edited doc but not in the original — the edits. */
function diffEditedTexts(
  original: StructuredNotes,
  edited: StructuredNotes
): string[] {
  const before = new Set(blockTexts(original.bodyHtml).map(normText));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of blockTexts(edited.bodyHtml)) {
    const n = normText(t);
    if (before.has(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }
  return out;
}

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
  const [doneInProgress, setDoneInProgress] = useState(false);
  const [readingActive, setReadingActive] = useState(false);
  const [readingFinished, setReadingFinished] = useState(false);
  const [editedTexts, setEditedTexts] = useState<string[]>([]);

  const draftRef = useRef(draft);
  const originalRef = useRef<StructuredNotes>(initial);
  const savedRef = useRef(saved);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

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

    setDoneInProgress(true);
    if (!same(edited, savedRef.current)) await persist();

    // Compute the edited regions, then render the note body so Atlas's cursor
    // can target the real elements that changed. However many regions there are,
    // the cursor visits them in turn and keeps hovering until the source re-read
    // resolves below — there is no separate full-screen overlay.
    const edits = changed ? diffEditedTexts(originalRef.current, edited) : [];
    setEditMode(false);
    setDoneInProgress(false);

    if (changed) {
      setEditedTexts(edits);
      setReadingActive(true);
    }

    const sourced = changed ? await refreshBodySources() : edited;

    if (changed) {
      setReadingActive(false);
      setReadingFinished(true);
      window.setTimeout(() => setReadingFinished(false), 3200);
    }

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
  const displayStatus = saved.status;

  if (displayStatus === "processing" || displayStatus === "failed") {
    const held = displayStatus === "processing" && saved.hold === "gemini_spend_cap";
    return (
      <ProcessingNoteState
        failed={displayStatus === "failed"}
        held={held}
        message={
          held
            ? "Your recording is saved. Atlas AI is temporarily unable to process new recordings, and yours will finish automatically once processing is restored — you'll get an email when it's done."
            : saved.summary
        }
      />
    );
  }

  const enriching = saved.enrichment === "pending";

  return (
    <div className="relative">
      {enriching && (
        <div className="mb-4 rounded-[4px] border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-sm text-amber-800 dark:text-amber-200/90">
          Adding supplementary context from the web. Your lecture notes are ready to read — new
          highlights may appear shortly.
        </div>
      )}
      {/* Notes-section toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {editMode ? "Editing notes" : "Lecture notes"}
        </h2>
        <div className="flex items-center gap-3">
          <AutosaveIndicator status={editMode ? status : "idle"} />
          {editMode ? (
            <motion.button
              layout
              onClick={doneInProgress ? undefined : done}
              disabled={doneInProgress}
              className={cn(
                "relative inline-flex items-center justify-center overflow-hidden bg-primary text-primary-foreground text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
                doneInProgress
                  ? "size-[30px] rounded-full"
                  : "h-[30px] rounded-[4px] px-3 gap-1.5"
              )}
              transition={{ layout: { type: "spring", stiffness: 420, damping: 30 } }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {doneInProgress ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Loader2 className="size-3.5 animate-spin" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="size-3.5" />
                    Done
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
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

      <AtlasCursor
        active={readingActive}
        finished={readingFinished}
        editedTexts={editedTexts}
        containerRef={articleRef}
      />
      <article ref={articleRef} className="relative space-y-10">
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
  held = false,
  message,
}: {
  failed: boolean;
  /** Held by the Gemini spend-cap incident: still processing, but paused. */
  held?: boolean;
  message: string;
}) {
  const iconClass = failed
    ? "relative mx-auto grid size-14 place-items-center rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive"
    : held
    ? "relative mx-auto grid size-14 place-items-center rounded-[4px] border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : "relative mx-auto grid size-14 place-items-center rounded-[4px] border border-primary/30 bg-primary/10 text-primary";

  return (
    <div className="relative overflow-hidden rounded-[4px] border border-border bg-card px-6 py-12 text-center">
      <span className={iconClass}>
        {failed || held ? (
          <AlertCircle className="size-6" />
        ) : (
          <Loader2 className="size-6 animate-spin" />
        )}
      </span>
      <h2 className="relative mt-5 text-3xl font-bold tracking-[-0.02em]">
        {failed
          ? "Processing failed"
          : held
          ? "Atlas is at capacity right now"
          : "Still processing"}
      </h2>
      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {held && (
        <div className="relative mx-auto mt-5 inline-flex items-center gap-2 rounded-[6px] border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <span className="font-semibold">You can safely close this tab</span>
          <span>— we&apos;ll email you when your notes are ready.</span>
        </div>
      )}
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

// Atlas's own cursor colour — amber/orange so it contrasts the green brand and
// is obviously "the system doing something", not the user's pointer.
const ATLAS_AMBER = "#fb6f4c";

/** The amber arrow pointer Atlas uses to inspect the note (hotspot = top-left). */
function AtlasPointer() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <path
        d="M5 3 L19 12 L12.5 13 L9 20 Z"
        fill={ATLAS_AMBER}
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Atlas's autonomous cursor. After an edit, it flies to each edited region in
 * the note, scrolls it into view, and wanders over it with natural (curved,
 * jittery) motion while the source re-read runs — then resolves into a large
 * "finished reading" popup at its last position. It visits every edited region
 * in turn, however many there are, and keeps hovering until the re-read resolves.
 * Positions are page coordinates rendered through a body portal, so the cursor
 * stays glued to the note content as the page scrolls.
 */
function AtlasCursor({
  active,
  finished,
  editedTexts,
  containerRef,
}: {
  active: boolean;
  finished: boolean;
  editedTexts: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const reduce = useReducedMotion();
  const xMv = useMotionValue(-100);
  const yMv = useMotionValue(-100);
  // Soft springs → slow, organic glide rather than mechanical snapping.
  const springX = useSpring(xMv, { stiffness: 72, damping: 17, mass: 1.1 });
  const springY = useSpring(yMv, { stiffness: 72, damping: 17, mass: 1.1 });
  const [shown, setShown] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const setPos = useCallback(
    (x: number, y: number) => {
      xMv.set(x);
      yMv.set(y);
    },
    [xMv, yMv]
  );

  useEffect(() => {
    if (!active || reduce) {
      if (!finished) setShown(false);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(res, ms);
        timeouts.push(id);
      });

    // Resolve edited text blocks → live DOM nodes inside the rendered note.
    const nodes = Array.from(container.querySelectorAll("li, p, h2, h3, h4"));
    const targets = editedTexts
      .map((text) => {
        const n = normText(text);
        return (
          nodes.find((el) => normText(el.textContent ?? "") === n) ??
          nodes.find((el) => {
            const t = normText(el.textContent ?? "");
            return t.length > 4 && (t.includes(n) || n.includes(t));
          }) ??
          null
        );
      })
      .filter((el): el is Element => !!el);

    const stops: Element[] = targets.length ? targets : [container];

    // Page (document) coordinates, not viewport coordinates: adding the current
    // scroll offset anchors the cursor to the spot *on the page* it's reading, so
    // it scrolls together with the content instead of floating over the viewport.
    const centerOf = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + window.scrollX + Math.min(r.width, 280) * (0.32 + Math.random() * 0.36),
        y: r.top + window.scrollY + r.height * (0.42 + Math.random() * 0.18),
      };
    };

    const moveTo = async (x: number, y: number) => {
      // Curved approach: a perpendicular-ish waypoint so it never travels straight.
      const cx = xMv.get();
      const cy = yMv.get();
      setPos((cx + x) / 2 + (Math.random() - 0.5) * 90, (cy + y) / 2 + (Math.random() - 0.5) * 70);
      await wait(240);
      if (cancelled) return;
      setPos(x, y);
      lastPosRef.current = { x, y };
      setLastPos({ x, y });
    };

    const run = async () => {
      stops[0]?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      await wait(420);
      if (cancelled) return;
      const first = centerOf(stops[0]);
      xMv.jump(first.x - 90);
      yMv.jump(first.y - 70);
      setShown(true);

      for (const node of stops) {
        if (cancelled) return;
        node.scrollIntoView?.({ behavior: "smooth", block: "center" });
        await wait(360);
        if (cancelled) return;
        const c = centerOf(node);
        await moveTo(c.x, c.y);
        await wait(420);
        // Linger and "read" — a couple of small organic drifts.
        for (let w = 0; w < 2 && !cancelled; w++) {
          setPos(c.x + (Math.random() - 0.5) * 28, c.y + (Math.random() - 0.5) * 18);
          await wait(440);
        }
      }

      // Re-read may still be running: keep gently hovering near the last spot.
      while (!cancelled) {
        const lp = lastPosRef.current;
        setPos(lp.x + (Math.random() - 0.5) * 42, lp.y + (Math.random() - 0.5) * 28);
        await wait(640);
      }
    };

    void run();
    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (finished && !reduce) setShown(true);
  }, [finished, reduce]);

  // `shown` only flips true from a client-side effect, so SSR/hydration always
  // render null here — the `typeof document` guard just keeps the portal target
  // safe without needing a separate mounted flag.
  if (reduce || !shown || typeof document === "undefined") return null;

  // The finished popup sits at the page spot where Atlas stopped reading. Clamp
  // its left edge to the document width so it can't overflow horizontally.
  const docWidth =
    typeof document !== "undefined"
      ? document.documentElement.clientWidth
      : 1200;
  const popLeft = Math.max(8, Math.min(lastPos.x, docWidth - 296));
  const popTop = Math.max(8, lastPos.y);

  return createPortal(
    // Absolutely positioned at the document origin so its page-coordinate
    // children scroll naturally with the note body.
    <div
      className="pointer-events-none absolute left-0 top-0 z-[60]"
      style={{ width: 0, height: 0 }}
    >
      <AnimatePresence mode="wait">
        {active && !finished ? (
          <motion.div
            key="cursor"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.18 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ x: springX, y: springY, position: "absolute", top: 0, left: 0 }}
          >
            <AtlasPointer />
            {/* Small reading label, offset from the pointer hotspot. */}
            <div
              className="absolute left-4 top-4 flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 shadow-sm"
              style={{ backgroundColor: ATLAS_AMBER }}
            >
              <Sparkles className="size-2.5 text-white" />
              <span className="text-[10px] font-medium text-white">Atlas is reading…</span>
            </div>
          </motion.div>
        ) : finished ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.85, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            style={{ position: "absolute", left: popLeft, top: popTop }}
          >
            {/* Deliberately larger than the note text so it's unmissable. */}
            <div
              className="flex items-center gap-2.5 rounded-[8px] border-2 bg-card px-4 py-3 shadow-[0_10px_36px_-10px_rgba(0,0,0,0.3)]"
              style={{ borderColor: ATLAS_AMBER }}
            >
              <span
                className="grid size-7 place-items-center rounded-full text-white"
                style={{ backgroundColor: ATLAS_AMBER }}
              >
                <Check className="size-4" />
              </span>
              <span className="text-base font-semibold tracking-tight sm:text-lg">
                Atlas finished reading
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
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
        <h3 className="text-2xl font-bold tracking-[-0.02em]">
          {section.heading}
        </h3>
      </div>

      <ul className="mt-4 space-y-2.5">
        {section.points.map((point, j) => (
          <li key={j} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <SourceBullet
              text={point.text}
              excerpt={point.source_excerpt}
              status={point.origin === "research" ? "research" : "lecture"}
            />
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
                <SourceBullet
                  text={point.text}
                  excerpt={point.source_excerpt}
                  status={point.origin === "research" ? "research" : "lecture"}
                />
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
