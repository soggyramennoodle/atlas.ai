/**
 * The structured shape of a generated set of lecture notes.
 * This is both what Gemini returns (via responseSchema) and what the UI renders.
 */

export interface NoteSubsection {
  heading: string;
  points: string[];
}

export interface NoteSection {
  heading: string;
  points: string[];
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
