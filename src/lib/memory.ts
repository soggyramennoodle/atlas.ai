import "server-only";
import type { UserMemory, UserProfile, MemoryCorrection } from "./types";

/**
 * Build the personalization context string injected into the note-generation
 * system prompt. Combines the student's profile (§5) and accumulated AI
 * memory (§2). Returns "" when there's nothing useful to say.
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

  const subjects = uniq([
    ...(memory?.subjects ?? []),
    ...(memory?.recurringCourses ?? []),
  ]);
  if (subjects.length) {
    lines.push(`Past courses / subjects: ${subjects.slice(0, 12).join(", ")}.`);
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

  if (memory?.stylePreferences?.length) {
    lines.push(
      `Style preferences inferred from their edits: ${memory.stylePreferences
        .slice(0, 8)
        .join("; ")}.`
    );
  }

  const recentCorrections = (memory?.corrections ?? []).slice(-5);
  if (recentCorrections.length) {
    lines.push(
      `Recent corrections they made to past notes (learn from these): ${recentCorrections
        .map((c) => c.summary)
        .join("; ")}.`
    );
  }

  return lines.join("\n");
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean).map((s) => s.trim()))).filter(
    Boolean
  );
}

/** Cap a string array, keeping the most recent (tail) entries and de-duping. */
function cap(arr: string[] | undefined, max: number): string[] {
  return uniq(arr ?? []).slice(-max);
}

/**
 * The structured deltas produced by the memory-update route after diffing an
 * edited note against the original (and asking Gemini to characterize them).
 */
export interface MemoryDelta {
  subjects?: string[];
  recurringConcepts?: string[];
  preferredTerminology?: string[];
  stylePreferences?: string[];
  /** A single human-readable summary of what the student changed and why. */
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
    stylePreferences: cap(
      [...(existing.stylePreferences ?? []), ...(delta.stylePreferences ?? [])],
      20
    ),
    corrections: corrections.slice(-40),
  };
}
