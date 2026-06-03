/**
 * Helpers for converting between the structured `StructuredNotes` body and the
 * rich-text HTML used by the word-processor editor (components/notes/
 * rich-note-editor.tsx) and the read-only note view. Pure string work so it is
 * safe to import on both the client and the server (exports).
 */
import type { NotePoint, StructuredNotes } from "@/lib/types";

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
