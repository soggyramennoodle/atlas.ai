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
    recurringConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    preferredTerminology: { type: Type.ARRAY, items: { type: Type.STRING } },
    stylePreferences: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctionSummary: { type: Type.STRING },
  },
  required: ["correctionSummary"],
  propertyOrdering: [
    "subjects",
    "recurringConcepts",
    "preferredTerminology",
    "stylePreferences",
    "correctionSummary",
  ],
};

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
      ? `A student edited their AI-generated lecture notes. Compare the ORIGINAL and EDITED versions and extract what the edits reveal about the student's preferences. Identify: meaningful additions/corrections/deletions, preferred terminology, and stylistic preferences (e.g. wants more detail, prefers shorter bullets, adds formulas). Write a concise "correctionSummary" (1-2 sentences) describing what they changed and what it implies for future notes.\n\nORIGINAL:\n${toText(original)}\n\nEDITED:\n${toText(edited)}`
      : `A student edited their lecture notes titled "${edited.title}". Infer their subjects and any stylistic preferences from the content, and write a short "correctionSummary".\n\nEDITED:\n${toText(edited)}`;

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
