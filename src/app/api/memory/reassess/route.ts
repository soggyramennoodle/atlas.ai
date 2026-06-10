import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";
import type { StructuredNotes, UserMemory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Re-evaluate the auto-derived learning lists against the notes that still
 * exist. Called after a note is deleted so residue from removed notes (e.g.
 * concepts from throwaway test recordings) gets cleaned up.
 *
 * Deliberately conservative and tightly scoped: it only prunes the three
 * fields Atlas accumulates automatically — recurringConcepts,
 * preferredTerminology, contentPreferences. It never touches subjects,
 * courses, corrections, formatting, or profile fields, because those can be
 * set or confirmed by the student via the refine chat and the blob carries no
 * provenance to safely re-derive them. When nothing supports a list anymore
 * (no notes left), the auto-derived lists are cleared.
 */

const PRUNED_FIELDS = [
  "recurringConcepts",
  "preferredTerminology",
  "contentPreferences",
] as const;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recurringConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    preferredTerminology: { type: Type.ARRAY, items: { type: Type.STRING } },
    contentPreferences: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["recurringConcepts", "preferredTerminology", "contentPreferences"],
  propertyOrdering: [
    "recurringConcepts",
    "preferredTerminology",
    "contentPreferences",
  ],
};

const SYSTEM = `You keep a student's learning profile honest. You are given (1) a compact summary of ALL the lecture notes the student STILL has, and (2) three lists Atlas previously inferred. Return the same three lists with ONLY the entries that are still supported by, or clearly relevant to, the remaining notes.

Rules:
- Remove an entry only when nothing in the remaining notes supports or relates to it.
- Be conservative: when in doubt, KEEP the entry. General study preferences can stay unless plainly tied to a subject the student no longer studies.
- Do not add anything new. Do not rewrite entries. Only keep or drop them.`;

function summarizeNotes(
  notes: { title: string | null; subject: string | null; content: StructuredNotes | null }[]
): string {
  const lines: string[] = [];
  for (const n of notes) {
    const parts: string[] = [];
    if (n.title) parts.push(n.title);
    if (n.subject) parts.push(`(${n.subject})`);
    const headings = (n.content?.sections ?? [])
      .map((s) => s.heading)
      .filter(Boolean)
      .slice(0, 8);
    const concepts = (n.content?.keyConcepts ?? [])
      .map((c) => c.term)
      .filter(Boolean)
      .slice(0, 12);
    let line = `- ${parts.join(" ")}`;
    if (headings.length) line += `\n    topics: ${headings.join("; ")}`;
    if (concepts.length) line += `\n    concepts: ${concepts.join(", ")}`;
    lines.push(line);
  }
  return lines.join("\n");
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: memoryRow } = await supabase
    .from("user_memory")
    .select("memory_blob")
    .maybeSingle();
  const memory = (memoryRow?.memory_blob as UserMemory | undefined) ?? null;
  if (!memory) return NextResponse.json({ ok: true, skipped: "no-memory" });

  const hasAutoLists = PRUNED_FIELDS.some(
    (f) => (memory[f] ?? []).length > 0
  );
  if (!hasAutoLists) return NextResponse.json({ ok: true, skipped: "nothing-to-prune" });

  const { data: rows } = await supabase
    .from("notes")
    .select("title, subject, content")
    .order("created_at", { ascending: false });
  const notes = (rows ?? []) as {
    title: string | null;
    subject: string | null;
    content: StructuredNotes | null;
  }[];

  // No notes left → the auto-derived lists have no support; clear them.
  let pruned: Pick<UserMemory, (typeof PRUNED_FIELDS)[number]>;
  if (notes.length === 0) {
    pruned = {
      recurringConcepts: [],
      preferredTerminology: [],
      contentPreferences: [],
    };
  } else {
    try {
      const ai = getGeminiClient();
      const res = await ai.models.generateContent({
        model: HELPER_MODEL,
        contents: `REMAINING NOTES:\n${summarizeNotes(notes)}\n\nLISTS TO RE-EVALUATE:\n${JSON.stringify(
          {
            recurringConcepts: memory.recurringConcepts ?? [],
            preferredTerminology: memory.preferredTerminology ?? [],
            contentPreferences: memory.contentPreferences ?? [],
          }
        )}`,
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
        },
      });
      if (!res.text) throw new Error("Empty response.");
      const parsed = JSON.parse(res.text) as Pick<
        UserMemory,
        (typeof PRUNED_FIELDS)[number]
      >;
      // Safety: only ever keep a subset of what already existed (never add).
      const keepSubset = (next?: string[], prev?: string[]) => {
        const allow = new Set((prev ?? []).map((s) => s.trim().toLowerCase()));
        return (next ?? []).filter((s) => allow.has(s.trim().toLowerCase()));
      };
      pruned = {
        recurringConcepts: keepSubset(
          parsed.recurringConcepts,
          memory.recurringConcepts
        ),
        preferredTerminology: keepSubset(
          parsed.preferredTerminology,
          memory.preferredTerminology
        ),
        contentPreferences: keepSubset(
          parsed.contentPreferences,
          memory.contentPreferences
        ),
      };
    } catch (err) {
      // Best-effort: a failed reassessment must never break note deletion.
      console.warn("Memory reassessment failed (non-fatal):", err);
      return NextResponse.json({ ok: true, skipped: "reassess-failed" });
    }
  }

  const updated: UserMemory = { ...memory, ...pruned };
  const { error } = await supabase.from("user_memory").upsert(
    {
      user_id: user.id,
      memory_blob: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Failed to persist reassessed memory:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
