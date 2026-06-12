"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { AuroraPanel } from "@/components/app/glass";
import { cn } from "@/lib/utils";
import {
  AI_BLOCK_ATTR,
  htmlToPlainText,
  notesBodyToHtml,
  parseNoteBullets,
  replaceLineWithAiHtml,
  sanitizeNoteHtml,
  seedBodyFromSections,
} from "@/lib/notes-html";
import { MathText } from "./math-text";
import { SummaryCard } from "./summary-card";
import { TranscriptPanel } from "./transcript-panel";
import { SourceBullet } from "./source-bubble";
import { KeyConceptsGrid } from "./concept-card";
import { AskableBlock, LineChatProvider } from "./line-chat";
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

const NOTE_GHOST_PILL =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white px-4 text-sm font-medium text-[#0d0d0d] outline-none transition hover:bg-black/[0.03] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-black/25 disabled:pointer-events-none disabled:opacity-60";

const NOTE_INPUT =
  "w-full rounded-2xl border border-black/[0.12] bg-white px-4 py-3 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/30 focus-visible:ring-2 focus-visible:ring-black/25";

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
  // Active "Add to note" regeneration: the line being rewritten, the "go deeper"
  // answer to fold in, and the note context the expand call needs.
  const [aiStream, setAiStream] = useState<{
    lineText: string;
    deeper: string;
    sourceExcerpt?: string;
    noteTitle?: string;
    subject?: string;
    summary?: string;
  } | null>(null);
  // Whether the top toolbar is on screen; drives the floating Edit/Done pill.
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const draftRef = useRef(draft);
  const originalRef = useRef<StructuredNotes>(initial);
  const savedRef = useRef(saved);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  // Reveal the floating Edit/Done pill once the top toolbar scrolls out of view.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setToolbarVisible(entry.isIntersecting),
      { rootMargin: "-8px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // ── "Add to note": stream an AI "go deeper" answer into the body ──────────
  const aiStreamRef = useRef(aiStream);
  useEffect(() => {
    aiStreamRef.current = aiStream;
  }, [aiStream]);

  // Start the regenerate-in-place flow. AiStreamBlock streams the rewrite live
  // in the note; commitAiStream replaces the line + persists once it's done.
  const onAddToNote = useCallback(
    (lineText: string, deeper: string, sourceExcerpt?: string) => {
      if (!lineText.trim() || !deeper.trim()) return;
      // A not-yet-edited note renders from `sections` and has no bodyHtml to
      // rewrite into. Seed one (preserving every source excerpt) so the rewrite
      // and its live stream have a rich-text body to land in. Persisted together
      // with the regenerated line in commitAiStream.
      if (!savedRef.current.bodyHtml) {
        const seeded = clone(savedRef.current);
        seeded.title = note.title;
        const { bodyHtml, bodySources } = seedBodyFromSections(seeded);
        seeded.bodyHtml = bodyHtml;
        seeded.bodySources = bodySources;
        setSaved(seeded);
        setDraft(seeded);
        savedRef.current = seeded;
        draftRef.current = seeded;
      }
      // Snapshot context into the stream so the AI block never remounts (and
      // re-fetches) when `saved` changes mid-stream.
      setAiStream({
        lineText,
        deeper,
        sourceExcerpt,
        noteTitle: note.title,
        subject: savedRef.current.subject,
        summary: savedRef.current.summary,
      });
    },
    [note.title]
  );

  const commitAiStream = useCallback(
    (fullText: string) => {
      const cur = aiStreamRef.current;
      setAiStream(null);
      if (!cur) return;

      const items = parseNoteBullets(fullText);
      if (!items.length) return; // nothing came back — leave the note untouched

      const base = clone(savedRef.current);
      base.title = note.title;
      const { html, matched, removedSourceIndex } = replaceLineWithAiHtml(
        base.bodyHtml ?? "",
        cur.lineText,
        items
      );
      base.bodyHtml = html;
      // The original line was removed: drop its source entry and shift later
      // ones down so every remaining hover-source bubble stays aligned.
      if (removedSourceIndex != null) {
        base.bodySources = (base.bodySources ?? [])
          .filter((s) => s.index !== removedSourceIndex)
          .map((s) =>
            s.index > removedSourceIndex ? { ...s, index: s.index - 1 } : s
          );
      }
      setSaved(base);
      setDraft(base);
      savedRef.current = base;
      draftRef.current = base;
      if (!matched) {
        toast.message("Added to your notes — couldn't pinpoint the exact line.");
      }

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
          toast.error("Couldn't save the addition.");
        });
    },
    [note.id, note.title]
  );

  const lineChat = useMemo(
    () => ({
      noteTitle: note.title,
      subject: saved.subject,
      summary: saved.summary,
      // Always offered: notes without a bodyHtml are seeded from their
      // structured sections on first add (see onAddToNote).
      canAddToNote: true,
      onAddToNote,
    }),
    [note.title, saved.subject, saved.summary, onAddToNote]
  );

  const aiStreamNode = useMemo(
    () =>
      aiStream ? (
        <AiStreamBlock
          key={aiStream.lineText}
          line={aiStream.lineText}
          deeper={aiStream.deeper}
          sourceExcerpt={aiStream.sourceExcerpt}
          noteTitle={aiStream.noteTitle}
          subject={aiStream.subject}
          summary={aiStream.summary}
          onDone={commitAiStream}
        />
      ) : null,
    [aiStream, commitAiStream]
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
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          Adding supplementary context from the web. Your lecture notes are ready to read — new
          highlights may appear shortly.
        </div>
      )}
      {/* Notes-section toolbar */}
      <div ref={toolbarRef} className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
          {editMode ? "Editing notes" : "Lecture notes"}
        </h2>
        <EditControls
          editMode={editMode}
          status={status}
          doneInProgress={doneInProgress}
          onEdit={startEditing}
          onDone={done}
        />
      </div>

      {/* Floating mirror of the toolbar's Edit/Done control, revealed once the
          toolbar scrolls out of view so editing/saving is reachable anywhere. */}
      <FloatingEditControls
        visible={!toolbarVisible}
        editMode={editMode}
        status={status}
        doneInProgress={doneInProgress}
        onEdit={startEditing}
        onDone={done}
      />

      <AtlasCursor
        active={readingActive}
        finished={readingFinished}
        editedTexts={editedTexts}
        containerRef={articleRef}
      />
      <LineChatProvider value={lineChat}>
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
          <EditedNoteBody
            html={saved.bodyHtml}
            sources={saved.bodySources ?? []}
            replaceLine={aiStream?.lineText}
            streamNode={aiStreamNode}
          />
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
            <h3 className="text-2xl font-normal tracking-[-0.02em] text-[#0d0d0d]">
              Key <span className="font-instrument italic">concepts</span>
            </h3>
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
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-black/[0.12] bg-white px-4 py-2 text-sm font-medium text-[#0d0d0d]/55 outline-none transition-colors hover:border-black/30 hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
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
      </LineChatProvider>
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
    ? "relative mx-auto grid size-14 place-items-center rounded-full border border-black/[0.16] bg-white text-[#0d0d0d]"
    : held
    ? "relative mx-auto grid size-14 place-items-center rounded-full border border-orange-500/35 bg-orange-500/10 text-orange-700"
    : "relative mx-auto grid size-14 place-items-center rounded-full border border-black/[0.12] bg-white text-[#0d0d0d]";

  return (
    <AuroraPanel
      active={!failed && !held}
      className="mx-auto max-w-2xl"
      panelClassName="px-6 py-12 text-center"
    >
      <span className={iconClass}>
        {failed || held ? (
          <AlertCircle className="size-6" />
        ) : (
          <Loader2 className="size-6 animate-spin" />
        )}
      </span>
      <h2 className="relative mt-5 text-3xl font-normal tracking-[-0.02em] text-[#0d0d0d]">
        {failed
          ? "Processing failed"
          : held
          ? "Atlas is at capacity right now"
          : "Still processing"}
      </h2>
      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#0d0d0d]/60">
        {message}
      </p>
      {held && (
        <div className="relative mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800">
          <span className="font-medium">You can safely close this tab</span>
          <span>— we&apos;ll email you when your notes are ready.</span>
        </div>
      )}
    </AuroraPanel>
  );
}

function tagOf(node: Node): string {
  return node instanceof HTMLElement ? node.rawTagName?.toLowerCase() ?? "" : "";
}

function EditedNoteBody({
  html,
  sources,
  replaceLine,
  streamNode,
}: {
  html: string;
  sources: BodySource[];
  /** Normalized text of the line currently being regenerated in place. */
  replaceLine?: string;
  /** The live-streaming AI block (an <li>) rendered in place of that line. */
  streamNode?: React.ReactNode;
}) {
  const content = useMemo(() => {
    const sourceByIndex = new Map(sources.map((source) => [source.index, source]));
    const root = parse(sanitizeNoteHtml(html), { lowerCaseTagName: true });
    let listItemIndex = 0;

    const want = replaceLine ? normText(replaceLine) : null;
    let streamShown = false;
    const matchesStream = (text: string) => {
      if (want == null || streamShown) return false;
      const t = normText(text);
      return (
        t === want || (t.length > 4 && (t.includes(want) || want.includes(t)))
      );
    };
    // Swap the rendered block for the live AI stream when it's the line being
    // regenerated. The original block is still present in `html` (the rewrite
    // isn't committed until streaming ends), so its list-index accounting is
    // already done by the caller — we only swap what's shown. `asListSibling`
    // controls whether the AI <li> sits directly in the list or needs its own
    // wrapping <ul> (when replacing a paragraph/heading).
    const replaceWithStream = (
      el: React.ReactNode,
      text: string,
      key: string,
      asListSibling: boolean
    ): React.ReactNode => {
      if (!streamNode || !matchesStream(text)) return el;
      streamShown = true;
      return asListSibling ? (
        <Fragment key={`${key}-s`}>{streamNode}</Fragment>
      ) : (
        <ul key={`${key}-s`}>{streamNode}</ul>
      );
    };

    const renderChildren = (nodes: Node[], keyPrefix: string, inListItem = false) =>
      nodes.map((node, index) =>
        renderNode(node, `${keyPrefix}-${index}`, inListItem)
      );

    const renderNode = (
      node: Node,
      key: string,
      inListItem = false
    ): React.ReactNode => {
      if (node.nodeType === NodeType.TEXT_NODE)
        return <MathText key={key} text={node.text} />;
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
        const text = blockText(node);
        return replaceWithStream(
          <h2 key={key}>
            <AskableBlock text={text}>{renderChildren(node.childNodes, key)}</AskableBlock>
          </h2>,
          text,
          key,
          false
        );
      }
      if (tag === "h3" || tag === "h4") {
        const text = blockText(node);
        return replaceWithStream(
          <h3 key={key}>
            <AskableBlock text={text}>{renderChildren(node.childNodes, key)}</AskableBlock>
          </h3>,
          text,
          key,
          false
        );
      }
      if (tag === "p") {
        const children = renderChildren(node.childNodes, key, inListItem);
        if (inListItem) return <span key={key}>{children}</span>;
        const text = blockText(node);
        return replaceWithStream(
          <p key={key}>
            <AskableBlock text={text}>{children}</AskableBlock>
          </p>,
          text,
          key,
          false
        );
      }
      if (tag === "ul") {
        return <ul key={key}>{renderChildren(node.childNodes, key)}</ul>;
      }
      if (tag === "ol") {
        return <ol key={key}>{renderChildren(node.childNodes, key)}</ol>;
      }
      if (tag === "li") {
        const inlineNodes = node.childNodes.filter((child) => {
          const childTag = tagOf(child);
          return childTag !== "ul" && childTag !== "ol";
        });
        const nestedLists = node.childNodes.filter((child) => {
          const childTag = tagOf(child);
          return childTag === "ul" || childTag === "ol";
        });
        const text = htmlToPlainText(inlineNodes.map((child) => child.toString()).join(""));
        const inline = renderChildren(inlineNodes, `${key}-inline`, true);

        // Atlas-added bullet: honest provenance, and crucially it does NOT consume
        // a lecture-source index, so existing bodySources stay aligned.
        if (node.getAttribute(AI_BLOCK_ATTR) != null) {
          return (
            <li key={key}>
              <SourceBullet text={text} status="ai">
                {inline}
              </SourceBullet>
              {renderChildren(nestedLists, `${key}-nested`)}
            </li>
          );
        }

        const currentIndex = listItemIndex;
        listItemIndex += 1;
        const source = sourceByIndex.get(currentIndex);
        const sourceable =
          source?.source_excerpt && (source.status === "lecture" || source.status === "edited");
        const sourceStatus: "lecture" | "edited" =
          source?.status === "edited" ? "edited" : "lecture";

        return replaceWithStream(
          <li key={key}>
            <AskableBlock
              text={text}
              sourceExcerpt={sourceable ? source.source_excerpt : undefined}
              sourceStatus={sourceStatus}
            >
              {sourceable ? (
                <SourceBullet
                  text={text}
                  excerpt={source.source_excerpt}
                  status={sourceStatus}
                >
                  {inline}
                </SourceBullet>
              ) : (
                inline
              )}
            </AskableBlock>
            {renderChildren(nestedLists, `${key}-nested`)}
          </li>,
          text,
          key,
          true
        );
      }

      return <p key={key}>{renderChildren(node.childNodes, key)}</p>;
    };

    return renderChildren(root.childNodes, "edited");
  }, [html, sources, replaceLine, streamNode]);

  return <div className="note-prose">{content}</div>;
}

/** Plain, whitespace-collapsed text of a parsed block (for matching/labels). */
function blockText(node: HTMLElement): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The live "Add to note" block: a violet, Atlas-flagged <li> rendered in place
 * of the line being regenerated. It streams the rewrite from /api/lines/expand
 * (the cheapest model, folding the "go deeper" answer into the original line),
 * showing tokens as they arrive, then calls `onDone(fullText)` so NoteView
 * replaces the line in the body and persists. Streaming is aborted on unmount;
 * an aborted stream never commits.
 */
function AiStreamBlock({
  line,
  deeper,
  sourceExcerpt,
  noteTitle,
  subject,
  summary,
  onDone,
}: {
  line: string;
  deeper: string;
  sourceExcerpt?: string;
  noteTitle?: string;
  subject?: string;
  summary?: string;
  onDone: (fullText: string) => void;
}) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const controller = new AbortController();
    let full = "";
    let aborted = false;

    (async () => {
      try {
        const res = await fetch("/api/lines/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line,
            deeper,
            sourceExcerpt,
            noteTitle,
            subject,
            summary,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          full += decoder.decode(value, { stream: true });
          setShown(full);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          aborted = true;
        }
      } finally {
        // Don't commit a partial rewrite if we were torn down mid-stream.
        if (!aborted) {
          setDone(true);
          doneRef.current(full);
        }
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <li className="text-violet-900/90">
      <SourceBullet text={shown || "…"} status="ai" />
      {!done && (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-full bg-violet-500 align-baseline"
        />
      )}
    </li>
  );
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
      if (!finished) Promise.resolve().then(() => setShown(false));
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
    if (finished && !reduce) Promise.resolve().then(() => setShown(true));
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
              className="flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 text-[#0d0d0d] shadow-[0_18px_44px_-26px_rgba(0,0,0,0.45)]"
              style={{ borderColor: ATLAS_AMBER }}
            >
              <span
                className="grid size-7 place-items-center rounded-full text-white"
                style={{ backgroundColor: ATLAS_AMBER }}
              >
                <Check className="size-4" />
              </span>
              <span className="text-base font-medium tracking-tight sm:text-lg">
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


/**
 * The Edit/Done action cluster — the autosave indicator plus the morphing
 * Edit (view) / Done (edit) button. Shared by the top toolbar and the floating
 * pill so their behavior can never drift.
 */
function EditControls({
  editMode,
  status,
  doneInProgress,
  onEdit,
  onDone,
}: {
  editMode: boolean;
  status: SaveStatus;
  doneInProgress: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <AutosaveIndicator status={editMode ? status : "idle"} />
      {editMode ? (
        <motion.button
          layout
          onClick={doneInProgress ? undefined : onDone}
          disabled={doneInProgress}
          className={cn(
            "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[#0d0d0d] text-xs font-medium text-white outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
            doneInProgress
              ? "size-[30px] rounded-full"
              : "h-[30px] gap-1.5 px-3"
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
        <button type="button" onClick={onEdit} className={NOTE_GHOST_PILL}>
          <Pencil className="size-3.5" />
          Edit notes
        </button>
      )}
    </div>
  );
}

/**
 * The floating Edit/Done pill: a fixed, bottom-right card hosting the same
 * {@link EditControls}, revealed (fade + slide; opacity-only under reduced
 * motion) once the top toolbar scrolls out of view. Sits below the line-chat
 * popup and AtlasCursor overlay so neither is obscured.
 */
function FloatingEditControls({
  visible,
  editMode,
  status,
  doneInProgress,
  onEdit,
  onDone,
}: {
  visible: boolean;
  editMode: boolean;
  status: SaveStatus;
  doneInProgress: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="fixed bottom-6 right-4 z-40 rounded-full border border-white/55 bg-white/70 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_50px_-28px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.07] backdrop-blur-xl sm:right-6"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <EditControls
            editMode={editMode}
            status={status}
            doneInProgress={doneInProgress}
            onEdit={onEdit}
            onDone={onDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
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
          className="inline-flex items-center gap-1.5 text-xs text-[#0d0d0d]/55"
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
        <span className="font-mono text-sm text-[#0d0d0d]/40">
          {(index + 1).toString().padStart(2, "0")}
        </span>
        <h3 className="text-2xl font-normal tracking-[-0.02em] text-[#0d0d0d]">
          <AskableBlock text={section.heading}>{section.heading}</AskableBlock>
        </h3>
      </div>

      <ul className="mt-4 space-y-2.5">
        {section.points.map((point, j) => (
          <li key={j} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#0d0d0d]/40" />
            <AskableBlock
              text={point.text}
              sourceExcerpt={point.source_excerpt}
              sourceStatus={point.origin === "research" ? "research" : "lecture"}
            >
              <SourceBullet
                text={point.text}
                excerpt={point.source_excerpt}
                status={point.origin === "research" ? "research" : "lecture"}
              />
            </AskableBlock>
          </li>
        ))}
      </ul>

      {section.subsections?.map((sub, k) => (
        <div key={k} className="mt-5 border-l border-black/[0.1] pl-5">
          <h4 className="font-medium tracking-tight text-[#0d0d0d]">
            <AskableBlock text={sub.heading}>{sub.heading}</AskableBlock>
          </h4>
          <ul className="mt-2.5 space-y-2">
            {sub.points.map((point, j) => (
              <li
                key={j}
                className="flex gap-3 text-sm leading-relaxed text-[#0d0d0d]/60"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-black/25" />
                <AskableBlock
                  text={point.text}
                  sourceExcerpt={point.source_excerpt}
                  sourceStatus={point.origin === "research" ? "research" : "lecture"}
                >
                  <SourceBullet
                    text={point.text}
                    excerpt={point.source_excerpt}
                    status={point.origin === "research" ? "research" : "lecture"}
                  />
                </AskableBlock>
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
    <div className="group/concept relative rounded-2xl border border-black/[0.08] bg-white p-5">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove concept"
        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full text-[#0d0d0d]/45 opacity-0 outline-none transition hover:bg-black/[0.05] hover:text-[#0d0d0d] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-black/25 group-hover/concept:opacity-100 motion-reduce:opacity-100"
      >
        <X className="size-4" />
      </button>
      <input
        value={concept.term}
        onChange={(e) => onTerm(e.target.value)}
        placeholder="Concept"
        className={cn(NOTE_INPUT, "pr-9 font-medium")}
      />
      <AutoTextarea
        value={concept.definition}
        onChange={onDefinition}
        placeholder="Definition"
        className="mt-2 w-full resize-none rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm leading-relaxed text-[#0d0d0d]/60 outline-none transition placeholder:text-[#0d0d0d]/40 focus:border-black/25 focus-visible:ring-2 focus-visible:ring-black/25"
      />
    </div>
  );
}
