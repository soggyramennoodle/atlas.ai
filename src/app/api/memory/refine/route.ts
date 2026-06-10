import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";
import { normalizeMemory } from "@/lib/memory";
import type { UserMemory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  message?: string;
}

/** Gemini schema for the editable slice of a memory blob the model may rewrite. */
const memorySchema: Schema = {
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
  },
  required: [
    "subjects",
    "courses",
    "recurringConcepts",
    "preferredTerminology",
    "contentPreferences",
    "formattingPreferences",
  ],
  propertyOrdering: [
    "subjects",
    "courses",
    "recurringConcepts",
    "preferredTerminology",
    "contentPreferences",
    "formattingPreferences",
  ],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    memory: memorySchema,
    summary: {
      type: Type.STRING,
      description:
        "A short, friendly 1-2 sentence note to the student describing what changed.",
    },
  },
  required: ["memory", "summary"],
  propertyOrdering: ["memory", "summary"],
};

const SYSTEM = `You maintain a student's personalization profile for Atlas, an AI lecture note-taker. You are given the CURRENT profile as JSON and a CORRECTION from the student in their own words. Apply the correction faithfully and conservatively:

- Update, add, or remove entries so the profile matches what the student says.
- Honor course codes they give (e.g. "it's BIO 101"): set or normalize the matching course's "code", and merge duplicates of the same course.
- If they say something is wrong, irrelevant, or not a real course, remove it (e.g. demote a one-off lecture topic that was wrongly recorded as a subject/course).
- Keep formatting preferences (plain text vs markdown, spacing, bullet length) in "formattingPreferences" only — never move them into the learning fields.
- Change ONLY what the correction implies. Preserve every other existing entry exactly as-is.
- Never invent facts, courses, codes, or preferences the student did not state.

Return the FULL updated profile (all fields, even unchanged ones) and a short, friendly "summary" telling the student what you changed. If the message asks for nothing actionable, return the profile unchanged and say so in the summary.`;

/**
 * Conversational correction of the student's AI memory. The student describes
 * a fix in plain language ("that's just Biology, not a Cellular Reproduction
 * course — it's BIO 101"); Gemini rewrites the blob to match, and the result
 * is normalized (capped/de-duped) before persisting. RLS scopes everything to
 * the current user. Read-only fields like correction history are preserved by
 * `normalizeMemory`.
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

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Tell Atlas what to fix." }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json(
      { error: "That correction is too long — keep it under 1000 characters." },
      { status: 400 }
    );
  }

  const { data: existingRow } = await supabase
    .from("user_memory")
    .select("memory_blob")
    .maybeSingle();
  const existing = (existingRow?.memory_blob as UserMemory | undefined) ?? {};

  // Present the model only the editable slice — never the correction history.
  const editable: Partial<UserMemory> = {
    subjects: existing.subjects ?? [],
    courses: existing.courses ?? [],
    recurringConcepts: existing.recurringConcepts ?? [],
    preferredTerminology: existing.preferredTerminology ?? [],
    contentPreferences: existing.contentPreferences ?? [],
    formattingPreferences: [
      ...(existing.formattingPreferences ?? []),
      ...(existing.stylePreferences ?? []),
    ],
  };

  let updated: UserMemory;
  let summary: string;
  try {
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: HELPER_MODEL,
      contents: `CURRENT PROFILE:\n${JSON.stringify(editable)}\n\nSTUDENT CORRECTION:\n${message}`,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    });
    if (!res.text) throw new Error("Empty response from the model.");
    const parsed = JSON.parse(res.text) as {
      memory: Partial<UserMemory>;
      summary: string;
    };
    updated = normalizeMemory(parsed.memory, existing);
    summary = parsed.summary?.trim() || "Updated what Atlas knows about you.";
  } catch (err) {
    console.error("Memory refine failed:", err);
    return NextResponse.json(
      { error: "Atlas couldn't apply that correction. Please try rephrasing." },
      { status: 502 }
    );
  }

  const { error: upsertError } = await supabase.from("user_memory").upsert(
    {
      user_id: user.id,
      memory_blob: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("Failed to persist refined memory:", upsertError);
    return NextResponse.json(
      { error: "Couldn't save that change." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, summary, memory: updated });
}
