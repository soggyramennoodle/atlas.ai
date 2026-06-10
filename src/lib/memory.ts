import "server-only";
import type {
  CourseEntry,
  UserMemory,
  UserProfile,
  MemoryCorrection,
} from "./types";

/** Render a course as a display label, e.g. "BIO 101 — Biology" or "Biology". */
export function courseLabel(c: CourseEntry): string {
  const name = c.name?.trim() ?? "";
  const code = c.code?.trim();
  if (code && name) return `${code} — ${name}`;
  return code || name;
}

/**
 * Build the personalization context string injected into the note-generation
 * system prompt. Combines the student's profile (§5) and accumulated AI
 * memory (§2). Returns "" when there's nothing useful to say.
 *
 * Note the deliberate separation: subjects/courses/concepts/terminology and
 * content preferences shape the SUBSTANCE of notes, while formatting
 * preferences are surfaced separately as presentation-only — they must never
 * be mistaken for "what Atlas knows about how the student learns".
 */
export function buildMemoryContext(
  memory: UserMemory | null,
  profile: UserProfile | null
): string {
  const lines: string[] = [];

  const who: string[] = [];
  if (profile?.program) who.push(`studies ${profile.program}`);
  if (profile?.institution) who.push(`at ${profile.institution}`);
  if (profile?.year) who.push(`(year: ${profile.year})`);
  if (who.length) lines.push(`This student ${who.join(" ")}.`);

  const courseLabels = (memory?.courses ?? []).map(courseLabel);
  const subjects = uniq([
    ...(memory?.subjects ?? []),
    ...courseLabels,
    ...(memory?.recurringCourses ?? []),
  ]);
  if (subjects.length) {
    lines.push(`Courses / subjects: ${subjects.slice(0, 12).join(", ")}.`);
  }

  if (memory?.recurringConcepts?.length) {
    lines.push(
      `Concepts that recur in their notes: ${memory.recurringConcepts
        .slice(0, 15)
        .join(", ")}.`
    );
  }

  if (memory?.preferredTerminology?.length) {
    lines.push(
      `Preferred terminology: ${memory.preferredTerminology.slice(0, 10).join("; ")}.`
    );
  }

  if (memory?.contentPreferences?.length) {
    lines.push(
      `Content depth & emphasis they prefer (apply to the substance of the notes): ${memory.contentPreferences
        .slice(0, 8)
        .join("; ")}.`
    );
  }

  // Legacy `stylePreferences` were mostly formatting; treat them as such on read.
  const formatting = uniq([
    ...(memory?.formattingPreferences ?? []),
    ...(memory?.stylePreferences ?? []),
  ]);
  if (formatting.length) {
    lines.push(
      `Note formatting preferences (presentation only — do not change academic content to satisfy these): ${formatting
        .slice(0, 8)
        .join("; ")}.`
    );
  }

  const recentCorrections = (memory?.corrections ?? []).slice(-5);
  if (recentCorrections.length) {
    lines.push(
      `Recent content corrections they made to past notes (learn from these): ${recentCorrections
        .map((c) => c.summary)
        .join("; ")}.`
    );
  }

  return lines.join("\n");
}

/** De-dupe case-insensitively, keeping the first-seen original casing. */
function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const v = raw?.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Cap a string array, keeping the most recent (tail) entries and de-duping. */
function cap(arr: string[] | undefined, max: number): string[] {
  return uniq(arr ?? []).slice(-max);
}

/** Normalize + de-dupe a course list by code (preferred) or lowercased name. */
export function normalizeCourses(
  courses: CourseEntry[] | undefined,
  max = 30
): CourseEntry[] {
  const byKey = new Map<string, CourseEntry>();
  for (const raw of courses ?? []) {
    const name = raw?.name?.trim() ?? "";
    const code = raw?.code?.trim() || undefined;
    if (!name && !code) continue;
    const key = (code ?? name).toLowerCase();
    const entry: CourseEntry = code ? { code, name: name || code } : { name };
    // Later entries win, but keep a code if an earlier duplicate had one.
    const prev = byKey.get(key);
    byKey.set(key, { ...prev, ...entry });
  }
  return Array.from(byKey.values()).slice(-max);
}

/**
 * The structured deltas produced by the memory-update route after diffing an
 * edited note against the original (and asking Gemini to characterize them).
 * Formatting changes are captured separately so they never pollute the
 * learning-signal fields.
 */
export interface MemoryDelta {
  subjects?: string[];
  courses?: CourseEntry[];
  recurringConcepts?: string[];
  preferredTerminology?: string[];
  contentPreferences?: string[];
  formattingPreferences?: string[];
  /** A single human-readable summary of the CONTENT/learning takeaway. */
  correctionSummary?: string;
  noteTitle?: string;
}

/** Merge a delta into an existing memory blob, keeping it bounded in size. */
export function mergeMemory(
  existing: UserMemory,
  delta: MemoryDelta
): UserMemory {
  const corrections: MemoryCorrection[] = [...(existing.corrections ?? [])];
  if (delta.correctionSummary) {
    corrections.push({
      at: new Date().toISOString(),
      noteTitle: delta.noteTitle,
      summary: delta.correctionSummary,
    });
  }

  return {
    ...existing,
    subjects: cap([...(existing.subjects ?? []), ...(delta.subjects ?? [])], 30),
    courses: normalizeCourses([
      ...(existing.courses ?? []),
      ...(delta.courses ?? []),
    ]),
    recurringConcepts: cap(
      [...(existing.recurringConcepts ?? []), ...(delta.recurringConcepts ?? [])],
      40
    ),
    preferredTerminology: cap(
      [
        ...(existing.preferredTerminology ?? []),
        ...(delta.preferredTerminology ?? []),
      ],
      25
    ),
    contentPreferences: cap(
      [
        ...(existing.contentPreferences ?? []),
        ...(delta.contentPreferences ?? []),
      ],
      20
    ),
    formattingPreferences: cap(
      [
        ...(existing.formattingPreferences ?? []),
        ...(delta.formattingPreferences ?? []),
      ],
      15
    ),
    corrections: corrections.slice(-40),
  };
}

/**
 * Sanitize a whole memory blob returned by an LLM (the refine / reassess
 * routes). Enforces the same caps and de-duping as `mergeMemory` so a model
 * can never blow the blob up or smuggle malformed entries into storage.
 * Profile-derived and correction-history fields are preserved from `base`
 * unless the new blob explicitly carries them.
 */
export function normalizeMemory(
  next: Partial<UserMemory>,
  base?: UserMemory
): UserMemory {
  return {
    program: next.program ?? base?.program,
    institution: next.institution ?? base?.institution,
    subjects: cap(next.subjects, 30),
    courses: normalizeCourses(next.courses),
    recurringConcepts: cap(next.recurringConcepts, 40),
    preferredTerminology: cap(next.preferredTerminology, 25),
    contentPreferences: cap(next.contentPreferences, 20),
    formattingPreferences: cap(next.formattingPreferences, 15),
    corrections: (next.corrections ?? base?.corrections ?? []).slice(-40),
  };
}
