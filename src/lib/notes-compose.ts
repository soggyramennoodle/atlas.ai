import type { KeyConcept, NoteSection, SegmentNotes } from "./types";

/** Join segment transcripts in order, dropping empties, single-spaced. */
export function joinTranscripts(segments: SegmentNotes[]): string {
  return segments
    .map((s) => s.transcript.trim())
    .filter(Boolean)
    .join(" ");
}

/** Case-insensitive dedupe by term; the first definition encountered wins. */
export function dedupeKeyConcepts(concepts: KeyConcept[]): KeyConcept[] {
  const seen = new Set<string>();
  const out: KeyConcept[] = [];
  for (const c of concepts) {
    const key = c.term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Deterministic, audio-faithful reconciliation of per-segment notes into the
 * body of a `StructuredNotes`. Sections are concatenated in segment order (the
 * lecture's natural order); key concepts are deduped; transcripts joined. This
 * is the structural merge — the LLM compose pass (gemini.composeNotes) only
 * adds the title/subject/summary and may lightly de-duplicate adjacent
 * headings. Kept pure so it is unit-testable and never invents content.
 */
export function mergeSegmentNotes(segments: SegmentNotes[]): {
  sections: NoteSection[];
  keyConcepts: KeyConcept[];
  transcript: string;
} {
  return {
    sections: segments.flatMap((s) => s.sections),
    keyConcepts: dedupeKeyConcepts(segments.flatMap((s) => s.keyConcepts)),
    transcript: joinTranscripts(segments),
  };
}

/** Count bullets across sections and subsections. */
export function countNotePoints(sections: NoteSection[]): number {
  return sections.reduce((total, section) => {
    const sub =
      section.subsections?.reduce((n, s) => n + s.points.length, 0) ?? 0;
    return total + section.points.length + sub;
  }, 0);
}

/**
 * If the compose model dropped segment bullets (common when downgrading segment
 * quality), restore the deterministic merge so nothing from the lecture is lost.
 */
export function preserveMergedPoints(
  composed: { sections: NoteSection[]; keyConcepts: KeyConcept[] },
  merged: { sections: NoteSection[]; keyConcepts: KeyConcept[] }
): { sections: NoteSection[]; keyConcepts: KeyConcept[] } {
  const sections =
    countNotePoints(composed.sections) < countNotePoints(merged.sections)
      ? merged.sections
      : composed.sections;

  const keyConcepts =
    composed.keyConcepts.length < merged.keyConcepts.length
      ? merged.keyConcepts
      : composed.keyConcepts;

  return { sections, keyConcepts };
}
