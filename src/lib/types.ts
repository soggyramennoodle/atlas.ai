/**
 * The structured shape of a generated set of lecture notes.
 * This is both what Gemini returns (via responseSchema) and what the UI renders.
 */

/**
 * A single note bullet. Gemini returns objects so each point can carry the
 * transcript excerpt it was sourced from (used for the hover-to-source bubble).
 * Older notes stored bullets as plain strings — `normalizePoints` in
 * components/notes/note-view.tsx accepts both shapes.
 */
export interface NotePoint {
  text: string;
  /** Verbatim transcript snippet this point was distilled from, if available. */
  source_excerpt?: string;
}

export interface NoteSubsection {
  heading: string;
  points: NotePoint[];
}

export interface NoteSection {
  heading: string;
  points: NotePoint[];
  subsections?: NoteSubsection[];
}

export interface KeyConcept {
  term: string;
  definition: string;
}

export interface StructuredNotes {
  /** A clean, descriptive title for the lecture. */
  title: string;
  /** Optional subject/course inferred from the content (e.g. "Organic Chemistry"). */
  subject?: string;
  /** A short overview paragraph, written after the detailed notes. */
  summary: string;
  /** Thorough, ordered notes that capture the full lecture in detail. */
  sections: NoteSection[];
  /** Key terms and their definitions, when the lecture introduces any. */
  keyConcepts: KeyConcept[];
  /**
   * The full, verbatim transcript of the lecture. Surfaced in a collapsible
   * "Full Transcript" panel and used as the source for bullet excerpts.
   * Optional because notes generated before this field existed won't have it.
   */
  transcript?: string;
  /**
   * Rich-text HTML of the note body, produced once the student edits the note
   * in the word-processor editor. When present it is the source of truth for
   * the body (sections/points are kept only as the original AI baseline, used
   * for the memory diff). Absent for freshly generated, un-edited notes —
   * those still render from the structured `sections`.
   */
  bodyHtml?: string;
}

/** A saved note row as stored in the database. */
export interface NoteRecord {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  content: StructuredNotes;
  audio_path: string | null;
  duration_seconds: number | null;
  created_at: string;
}

/**
 * Per-user AI memory. `memory_blob` accumulates context Atlas uses to
 * personalize future note generation. Stored in the `user_memory` table.
 */
export interface UserMemory {
  /** Program / major, e.g. "BSc Computer Science". */
  program?: string;
  /** Institution name. */
  institution?: string;
  /** Subjects/courses the student has recorded, most recent first. */
  subjects?: string[];
  /** Recurring professors or course codes mentioned across notes. */
  recurringCourses?: string[];
  /** Inferred stylistic / detail-level preferences from past edits. */
  stylePreferences?: string[];
  /** Domain terminology the student prefers, e.g. "uses 'big-O' not 'order'". */
  preferredTerminology?: string[];
  /** Structured log of meaningful corrections the student made to past notes. */
  corrections?: MemoryCorrection[];
  /** Concepts that recur across the student's notes. */
  recurringConcepts?: string[];
}

export interface MemoryCorrection {
  /** ISO timestamp of when the edit was saved. */
  at: string;
  /** The note this correction came from. */
  noteTitle?: string;
  /** A short, human-readable summary of what the student changed and why. */
  summary: string;
}

/** A row in the `user_profiles` table. */
export interface UserProfile {
  user_id: string;
  display_name: string | null;
  institution: string | null;
  program: string | null;
  year: string | null;
  grad_year: string | null;
  created_at: string;
}
