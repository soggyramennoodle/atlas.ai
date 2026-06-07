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

export interface BodySource {
  /** Zero-based order of the list item inside the edited rich-text body. */
  index: number;
  /** The edited list-item text this attribution was checked against. */
  text: string;
  /**
   * Whether the edited item is still close to the lecture source, or is a
   * lecture-derived idea that the student heavily rewrote.
   */
  status: "lecture" | "edited" | "user";
  /** Verbatim lecture/transcript snippet, when the item is sourceable. */
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
  /** Server-side generation state for placeholder/error notes. */
  status?: "processing" | "failed" | "ready";
  /**
   * Set while the note's job is held by a system incident (e.g. the Gemini
   * spend cap). Kept alongside status: "processing" so watchers can show an
   * honest "at capacity" state without treating the note as finished. Cleared
   * when the incident resolves and the job resumes.
   */
  hold?: "gemini_spend_cap" | null;
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
  /**
   * Source mapping for edited `bodyHtml` list items. Regenerated with the
   * helper Gemini model after edits so source bubbles can survive light or
   * moderate rewrites without pretending every user addition came from audio.
   */
  bodySources?: BodySource[];
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

export type FeedbackCategory = "inaccurate" | "wrong" | "other";

export type FeedbackStatus = "unread" | "read" | "resolved" | "dismissed";

/** A row in the `user_feedback` table. */
export interface UserFeedback {
  id: string;
  user_id: string;
  note_id: string | null;
  category: FeedbackCategory;
  message: string | null;
  page_path: string | null;
  status: FeedbackStatus;
  reporter_email: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Feedback row enriched for the admin inbox. */
export interface AdminFeedbackRow extends UserFeedback {
  note_title: string | null;
}

/** A row in the `user_profiles` table. */
export interface UserProfile {
  user_id: string;
  display_name: string | null;
  institution: string | null;
  program: string | null;
  year: string | null;
  grad_year: string | null;
  welcome_email_sent_at: string | null;
  ui_tour_completed_at: string | null;
  created_at: string;
}

/** Status of a durable lecture-processing job (server-side state machine). */
export type LectureJobStatus =
  | "recording"
  | "recording_complete"
  | "processing"
  | "ready"
  | "failed";

/** Status of one ~5-minute audio segment within a job. */
export type LectureSegmentStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "failed";

/**
 * Audio-grounded notes for a single ~5-minute segment. Produced by
 * `transcribeSegment` from that segment's real audio, then reconciled into a
 * full `StructuredNotes` by `composeNotes`. Deliberately omits title/subject/
 * summary — those are decided once, at compose time, over the whole lecture.
 */
export interface SegmentNotes {
  transcript: string;
  sections: NoteSection[];
  keyConcepts: KeyConcept[];
}

/** A row in `public.lecture_jobs`. */
export interface LectureJobRecord {
  id: string;
  user_id: string;
  note_id: string;
  status: LectureJobStatus;
  segment_count: number | null;
  total_seconds: number | null;
  source: "microphone" | "device";
  session_label: string;
  live_transcript: string | null;
  attempts: number;
  heartbeat_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** A row in `public.lecture_segments`. */
export interface LectureSegmentRecord {
  id: string;
  job_id: string;
  index: number;
  r2_key: string;
  status: LectureSegmentStatus;
  duration_seconds: number | null;
  transcript_text: string | null;
  partial_notes: SegmentNotes | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

/** Kinds of system-wide incident tracked in `public.system_alerts`. */
export type SystemAlertType = "GEMINI_SPEND_CAP";

/** A row in `public.system_alerts`. */
export interface SystemAlert {
  id: string;
  type: SystemAlertType;
  active: boolean;
  first_detected_at: string;
  last_detected_at: string;
  notification_sent: boolean;
  resolved_at: string | null;
  created_at: string;
}
