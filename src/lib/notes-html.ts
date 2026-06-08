/**
 * Helpers for converting between the structured `StructuredNotes` body and the
 * rich-text HTML used by the word-processor editor (components/notes/
 * rich-note-editor.tsx) and the read-only note view. Pure string work so it is
 * safe to import on both the client and the server (exports).
 */
import { parse } from "node-html-parser";
import type { BodySource, NotePoint, StructuredNotes } from "@/lib/types";

function pointText(p: NotePoint | string): string {
  return typeof p === "string" ? p : p.text;
}

/** Escape a plain string for safe interpolation into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Seed HTML for the editor / view from the structured note body. Sections become
 * H2s, subsections H3s, and points unordered lists — a clean, continuous
 * document the student can edit freely.
 */
export function notesBodyToHtml(notes: StructuredNotes): string {
  const parts: string[] = [];

  for (const section of notes.sections ?? []) {
    if (section.heading?.trim()) parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    const points = (section.points ?? []).filter((p) => pointText(p).trim());
    if (points.length) {
      parts.push(
        `<ul>${points.map((p) => `<li>${escapeHtml(pointText(p))}</li>`).join("")}</ul>`
      );
    }
    for (const sub of section.subsections ?? []) {
      if (sub.heading?.trim()) parts.push(`<h3>${escapeHtml(sub.heading)}</h3>`);
      const subPoints = (sub.points ?? []).filter((p) => pointText(p).trim());
      if (subPoints.length) {
        parts.push(
          `<ul>${subPoints
            .map((p) => `<li>${escapeHtml(pointText(p))}</li>`)
            .join("")}</ul>`
        );
      }
    }
  }

  return parts.join("") || "<p></p>";
}

/**
 * Lightly sanitize stored body HTML before rendering it with
 * dangerouslySetInnerHTML. The HTML always originates from our own ProseMirror
 * schema (a safe tag set), but we still strip scripts, inline styles, and event
 * handlers as defense in depth.
 */
export function sanitizeNoteHtml(html: string): string {
  return html
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");
}

/**
 * Flatten a notes document to plain text suitable for feeding back to the model
 * (e.g. regenerating the summary). Prefers the verbatim transcript when present
 * — it's the richest source — and otherwise reconstructs the body from the
 * edited `bodyHtml` or the structured sections, then appends key concepts.
 */
export function notesToPlainText(notes: StructuredNotes): string {
  const parts: string[] = [];

  if (notes.title?.trim()) parts.push(`Title: ${notes.title.trim()}`);
  if (notes.subject?.trim()) parts.push(`Subject: ${notes.subject.trim()}`);

  if (notes.transcript?.trim()) {
    parts.push(`Transcript:\n${notes.transcript.trim()}`);
  } else if (notes.bodyHtml?.trim()) {
    parts.push(`Notes:\n${htmlToPlainText(notes.bodyHtml)}`);
  } else {
    const body: string[] = [];
    for (const section of notes.sections ?? []) {
      if (section.heading?.trim()) body.push(`## ${section.heading.trim()}`);
      for (const p of section.points ?? []) {
        const t = pointText(p).trim();
        if (t) body.push(`- ${t}`);
      }
      for (const sub of section.subsections ?? []) {
        if (sub.heading?.trim()) body.push(`### ${sub.heading.trim()}`);
        for (const p of sub.points ?? []) {
          const t = pointText(p).trim();
          if (t) body.push(`- ${t}`);
        }
      }
    }
    if (body.length) parts.push(`Notes:\n${body.join("\n")}`);
  }

  const concepts = (notes.keyConcepts ?? [])
    .filter((c) => c.term?.trim())
    .map((c) => `- ${c.term.trim()}: ${c.definition?.trim() ?? ""}`);
  if (concepts.length) parts.push(`Key concepts:\n${concepts.join("\n")}`);

  return parts.join("\n\n").trim();
}

/** Strip tags to plain text — used by the memory diff to compare edits. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Marker attribute flagging a note block as Atlas-generated (not lecture-sourced). */
export const AI_BLOCK_ATTR = "data-atlas-ai";

/** Normalize block text for tolerant matching (mirrors note-view's normText). */
function normForMatch(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Split an AI "go deeper" answer into note-sized bullet items. Paragraphs
 * (double-newline separated) become separate bullets; a single block stays one
 * bullet. Whitespace is collapsed so the inserted notes read cleanly.
 */
export function splitToNoteItems(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Insert Atlas-generated bullet(s) into note `bodyHtml` immediately after the
 * block whose text matches `afterText`. Each new item is tagged with
 * {@link AI_BLOCK_ATTR} so the renderer can mark its provenance and exclude it
 * from lecture-source indexing (keeping existing `bodySources` aligned).
 *
 * When the target is a list item the bullets join its list; otherwise (a
 * paragraph or heading) they are wrapped in their own `<ul>`. If no block
 * matches — e.g. the line was edited concurrently — the bullets are appended at
 * the end of the body and `matched` is returned `false` so the caller can warn.
 */
export function insertAiBlockHtml(
  bodyHtml: string,
  afterText: string,
  items: string[]
): { html: string; matched: boolean } {
  const clean = items.map((t) => t.trim()).filter(Boolean);
  if (!clean.length) return { html: bodyHtml, matched: true };

  const liHtml = clean
    .map((t) => `<li ${AI_BLOCK_ATTR}="1">${escapeHtml(t)}</li>`)
    .join("");

  const root = parse(sanitizeNoteHtml(bodyHtml || "<p></p>"), {
    lowerCaseTagName: true,
  });
  const want = normForMatch(afterText);
  const candidates = root.querySelectorAll("li, p, h1, h2, h3, h4");
  const target =
    candidates.find((el) => normForMatch(el.textContent) === want) ??
    candidates.find((el) => {
      const t = normForMatch(el.textContent);
      return t.length > 4 && (t.includes(want) || want.includes(t));
    });

  if (!target) {
    return { html: `${root.toString()}<ul>${liHtml}</ul>`, matched: false };
  }

  const tag = target.rawTagName?.toLowerCase();
  target.insertAdjacentHTML(
    "afterend",
    tag === "li" ? liHtml : `<ul>${liHtml}</ul>`
  );
  return { html: root.toString(), matched: true };
}

/**
 * Build a rich-text body (and matching source map) from a structured notes
 * document, so a not-yet-edited note can gain a `bodyHtml` the first time the
 * student adds AI content to it. The list-item order mirrors
 * {@link notesBodyToHtml} exactly — points then subsection points, per section,
 * skipping empties — so each `BodySource.index` lines up with the `<li>` index
 * the renderer assigns, preserving every hover-source excerpt.
 */
export function seedBodyFromSections(notes: StructuredNotes): {
  bodyHtml: string;
  bodySources: BodySource[];
} {
  const bodyHtml = notesBodyToHtml(notes);
  const bodySources: BodySource[] = [];
  let index = 0;

  const consume = (p: NotePoint | string) => {
    const text = pointText(p).trim();
    if (!text) return; // notesBodyToHtml omits empty points, so don't index them
    const excerpt = typeof p === "string" ? "" : p.source_excerpt?.trim() ?? "";
    if (excerpt) {
      bodySources.push({ index, text, status: "lecture", source_excerpt: excerpt });
    }
    index += 1;
  };

  for (const section of notes.sections ?? []) {
    for (const p of section.points ?? []) consume(p);
    for (const sub of section.subsections ?? []) {
      for (const p of sub.points ?? []) consume(p);
    }
  }

  return { bodyHtml, bodySources };
}
