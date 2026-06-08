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
 * Parse a regenerated-line model response into note-sized bullet items. The
 * expand prompt emits one bullet per line; this splits on newlines, strips any
 * stray list markers ("-", "*", "•", "1.") the model may add, and collapses
 * whitespace so each bullet reads cleanly.
 */
export function parseNoteBullets(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•‣·]|\d+[.)])\s+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

/**
 * Replace the note block whose text matches `lineText` with Atlas-regenerated
 * bullet(s). Each replacement bullet is tagged with {@link AI_BLOCK_ATTR} so the
 * renderer marks its provenance and excludes it from lecture-source indexing.
 *
 * Because the original line is removed, `removedSourceIndex` reports the
 * lecture-source index it occupied (counting only non-AI `<li>` before it in
 * document order) — or `null` when the target wasn't a sourceable list item — so
 * the caller can drop that entry and shift later `bodySources` down by one,
 * keeping every remaining source bubble aligned.
 *
 * If no block matches — e.g. the line was edited concurrently — the bullets are
 * appended at the end and `matched` is returned `false`.
 */
export function replaceLineWithAiHtml(
  bodyHtml: string,
  lineText: string,
  items: string[]
): { html: string; matched: boolean; removedSourceIndex: number | null } {
  const clean = items.map((t) => t.trim()).filter(Boolean);
  const liHtml = clean
    .map((t) => `<li ${AI_BLOCK_ATTR}="1">${escapeHtml(t)}</li>`)
    .join("");

  const root = parse(sanitizeNoteHtml(bodyHtml || "<p></p>"), {
    lowerCaseTagName: true,
  });
  if (!liHtml) return { html: root.toString(), matched: true, removedSourceIndex: null };

  const want = normForMatch(lineText);
  const candidates = root.querySelectorAll("li, p, h1, h2, h3, h4");
  const target =
    candidates.find((el) => normForMatch(el.textContent) === want) ??
    candidates.find((el) => {
      const t = normForMatch(el.textContent);
      return t.length > 4 && (t.includes(want) || want.includes(t));
    });

  if (!target) {
    return {
      html: `${root.toString()}<ul>${liHtml}</ul>`,
      matched: false,
      removedSourceIndex: null,
    };
  }

  const isLi = target.rawTagName?.toLowerCase() === "li";

  // Lecture-source index of the target = count of non-AI <li> before it.
  let removedSourceIndex: number | null = null;
  if (isLi && target.getAttribute(AI_BLOCK_ATTR) == null) {
    let count = 0;
    for (const li of root.querySelectorAll("li")) {
      if (li === target) {
        removedSourceIndex = count;
        break;
      }
      if (li.getAttribute(AI_BLOCK_ATTR) == null) count += 1;
    }
  }

  target.insertAdjacentHTML("afterend", isLi ? liHtml : `<ul>${liHtml}</ul>`);
  target.remove();
  return { html: root.toString(), matched: true, removedSourceIndex };
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
