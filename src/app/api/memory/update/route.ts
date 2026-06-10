import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";
import { mergeMemory, type MemoryDelta } from "@/lib/memory";
import { htmlToPlainText } from "@/lib/notes-html";
import type { StructuredNotes, UserMemory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  noteId?: string;
  original?: StructuredNotes;
  edited?: StructuredNotes;
}

/** Flatten a notes document to a comparable plain-text outline. */
function toText(n: StructuredNotes): string {
  const lines: string[] = [`# ${n.title}`, n.summary ?? ""];
  // Once a note has been edited in the rich-text editor, the HTML body is the
  // source of truth — diff against that instead of the stale baseline sections.
  if (n.bodyHtml) {
    lines.push(htmlToPlainText(n.bodyHtml));
  } else {
    for (const s of n.sections ?? []) {
      lines.push(`## ${s.heading}`);
      for (const p of s.points ?? []) lines.push(`- ${pointText(p)}`);
      for (const sub of s.subsections ?? []) {
        lines.push(`### ${sub.heading}`);
        for (const p of sub.points ?? []) lines.push(`  - ${pointText(p)}`);
      }
    }
  }
  for (const c of n.keyConcepts ?? []) lines.push(`* ${c.term}: ${c.definition}`);
  return lines.join("\n");
}

function pointText(p: unknown): string {
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && "text" in p) return String((p as { text: string }).text);
  return "";
}

const deltaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
    courses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          name: { type: Type.STRING },
        },
        required: ["name"],
        propertyOrdering: ["code", "name"],
      },
    },
    recurringConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    preferredTerminology: { type: Type.ARRAY, items: { type: Type.STRING } },
    contentPreferences: { type: Type.ARRAY, items: { type: Type.STRING } },
    formattingPreferences: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctionSummary: { type: Type.STRING },
  },
  required: ["correctionSummary"],
  propertyOrdering: [
    "subjects",
    "courses",
    "recurringConcepts",
    "preferredTerminology",
    "contentPreferences",
    "formattingPreferences",
    "correctionSummary",
  ],
};

const EXTRACTION_INSTRUCTIONS = `You maintain a student's personalization profile for Atlas, an AI lecture note-taker. Extract ONLY signal that helps Atlas generate better notes for THIS student in the future. Strongly favor ACADEMIC CONTENT and how the student LEARNS over cosmetics.

Populate each field carefully:
- subjects: broad fields of study evident from the note (e.g. "Biology", "Microeconomics"). Do NOT turn a single lecture's topic into a subject or course — a lecture about cellular reproduction is Biology, not a "Cellular Reproduction" subject.
- courses: only when an actual ongoing course is identifiable. Set "code" ONLY if a real course code literally appears in the material (e.g. "BIO 101"); never invent or guess a code.
- recurringConcepts: substantive concepts the student engaged with, added, or expanded.
- preferredTerminology: domain/conceptual terms or notation the student clearly prefers (e.g. "uses 'mitosis' not 'cell division'"). This is about meaning, NOT formatting.
- contentPreferences: preferences about the SUBSTANCE and DEPTH of notes (e.g. "wants worked examples", "wants derivations shown", "more clinical detail"). NOT formatting.
- formattingPreferences: purely presentational choices ONLY — plain text vs markdown, bullet length, line spacing, headings. Put ALL cosmetic changes here and NOWHERE else; they must never leak into the fields above.
- correctionSummary: 1-2 sentences describing the CONTENT/LEARNING takeaway of the edit (what the student added or fixed conceptually and what it implies for future notes). If the edit was purely cosmetic, say so briefly and leave the learning fields empty.

Rules: Prefer empty arrays over guesses. Never infer a course or code that isn't supported by the material. Distinguish a one-off lecture topic from an ongoing course.`;

/**
 * Called after a user saves edited notes. Diffs the original AI output against
 * the edited version, asks Gemini to characterize the meaningful changes, and
 * appends the result to the user's memory blob (§2).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { noteId, edited } = body;
  let { original } = body;
  if (!edited) {
    return NextResponse.json({ error: "Missing edited notes." }, { status: 400 });
  }

  // If the client didn't send the original, we can't diff — bail gracefully.
  if (!original && noteId) {
    const { data } = await supabase
      .from("notes")
      .select("content")
      .eq("id", noteId)
      .maybeSingle();
    original = (data?.content as StructuredNotes | undefined) ?? undefined;
  }

  // Characterize the edit with the cheap helper model. Best-effort: if the
  // model call fails we still want the note save to have succeeded, so we
  // never surface this as a hard error.
  let delta: MemoryDelta = { correctionSummary: "" };
  try {
    const ai = getGeminiClient();
    const prompt = original
      ? `${EXTRACTION_INSTRUCTIONS}\n\nCompare the ORIGINAL and EDITED versions of the student's lecture notes below.\n\nORIGINAL:\n${toText(original)}\n\nEDITED:\n${toText(edited)}`
      : `${EXTRACTION_INSTRUCTIONS}\n\nThe student edited their lecture notes titled "${edited.title}". Infer only what the content supports.\n\nEDITED:\n${toText(edited)}`;

    const res = await ai.models.generateContent({
      model: HELPER_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: deltaSchema,
        temperature: 0.2,
      },
    });
    if (res.text) {
      const parsed = JSON.parse(res.text) as MemoryDelta;
      delta = { ...parsed };
    }
  } catch (err) {
    console.error("Memory characterization failed (non-fatal):", err);
  }

  delta.noteTitle = edited.title;
  if (edited.subject) delta.subjects = [...(delta.subjects ?? []), edited.subject];

  // Merge into the existing blob (RLS-scoped to the user).
  const { data: existingRow } = await supabase
    .from("user_memory")
    .select("memory_blob")
    .maybeSingle();
  const existing = (existingRow?.memory_blob as UserMemory | undefined) ?? {};
  const merged = mergeMemory(existing, delta);

  const { error: upsertError } = await supabase.from("user_memory").upsert(
    {
      user_id: user.id,
      memory_blob: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("Failed to persist memory:", upsertError);
    return NextResponse.json(
      { error: "Couldn't update memory." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
