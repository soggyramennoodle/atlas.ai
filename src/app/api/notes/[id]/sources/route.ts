import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { parse } from "node-html-parser";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";
import { htmlToPlainText, sanitizeNoteHtml } from "@/lib/notes-html";
import type { BodySource, NotePoint, StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ITEMS = 140;
const MAX_CANDIDATES = 220;

function pointText(p: NotePoint | string): string {
  return typeof p === "string" ? p : p.text;
}

function listItemsFromHtml(html: string): string[] {
  const root = parse(sanitizeNoteHtml(html), { lowerCaseTagName: true });
  return root
    .querySelectorAll("li")
    .map((li) => htmlToPlainText(li.innerHTML).replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

function sourceCandidates(notes: StructuredNotes) {
  const out: { index: number; text: string; source_excerpt: string }[] = [];
  for (const section of notes.sections ?? []) {
    for (const point of section.points ?? []) {
      const text = pointText(point).trim();
      const source_excerpt =
        typeof point === "string" ? "" : point.source_excerpt?.trim() ?? "";
      if (text && source_excerpt) {
        out.push({ index: out.length, text, source_excerpt });
      }
    }
    for (const sub of section.subsections ?? []) {
      for (const point of sub.points ?? []) {
        const text = pointText(point).trim();
        const source_excerpt =
          typeof point === "string" ? "" : point.source_excerpt?.trim() ?? "";
        if (text && source_excerpt) {
          out.push({ index: out.length, text, source_excerpt });
        }
      }
    }
  }
  return out.slice(0, MAX_CANDIDATES);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function similarity(a: string, b: string): number {
  const aa = tokens(a);
  const bb = tokens(b);
  if (!aa.size || !bb.size) return 0;
  let overlap = 0;
  for (const t of aa) if (bb.has(t)) overlap += 1;
  return overlap / Math.max(aa.size, bb.size);
}

function fallbackAttributions(
  items: string[],
  candidates: ReturnType<typeof sourceCandidates>
): BodySource[] {
  return items.map((text, index) => {
    let best = candidates[0];
    let score = 0;
    for (const candidate of candidates) {
      const next = similarity(text, candidate.text);
      if (next > score) {
        score = next;
        best = candidate;
      }
    }
    if (!best || score < 0.48) return { index, text, status: "user" };
    return {
      index,
      text,
      status: score >= 0.78 ? "lecture" : "edited",
      source_excerpt: best.source_excerpt,
    };
  });
}

const bodySourceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          status: {
            type: Type.STRING,
            format: "enum",
            enum: ["lecture", "edited", "user"],
          },
          source_excerpt: { type: Type.STRING },
        },
        required: ["index", "status"],
        propertyOrdering: ["index", "status", "source_excerpt"],
      },
    },
  },
  required: ["sources"],
  propertyOrdering: ["sources"],
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: note, error } = await supabase
    .from("notes")
    .select("content")
    .eq("id", id)
    .single();

  if (error || !note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const content = note.content as StructuredNotes;
  const bodyHtml = content.bodyHtml?.trim();
  if (!bodyHtml) {
    return NextResponse.json({ content });
  }

  const items = listItemsFromHtml(bodyHtml);
  const candidates = sourceCandidates(content);
  if (!items.length || !candidates.length) {
    const next = { ...content, bodySources: [] };
    await supabase.from("notes").update({ content: next }).eq("id", id);
    return NextResponse.json({ content: next });
  }

  let sources = fallbackAttributions(items, candidates);
  const candidateExcerpts = new Set(candidates.map((candidate) => candidate.source_excerpt));
  try {
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: HELPER_MODEL,
      contents: `Classify whether each EDITED_NOTE_ITEM still comes from one of the ORIGINAL_SOURCE_POINTS.

Rules:
- Use only ORIGINAL_SOURCE_POINTS. Do not invent quotes.
- "lecture": the edited item is essentially the same fact/claim as an original source point.
- "edited": the edited item still clearly comes from the lecture, but the student heavily rewrote, combined, or reframed it.
- "user": the item is a new user addition or too changed to honestly source to the lecture.
- For "lecture" or "edited", return the best matching original source_excerpt exactly as provided.
- Return one result for every edited item index.

EDITED_NOTE_ITEMS:
${JSON.stringify(items.map((text, index) => ({ index, text })))}

ORIGINAL_SOURCE_POINTS:
${JSON.stringify(candidates)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: bodySourceSchema,
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    if (res.text) {
      const parsed = JSON.parse(res.text) as { sources?: BodySource[] };
      const fallbackByIndex = new Map(sources.map((s) => [s.index, s]));
      sources = items.map((text, index) => {
        const modelSource = parsed.sources?.find((s) => s.index === index);
        if (!modelSource) return fallbackByIndex.get(index) ?? { index, text, status: "user" };
        const source_excerpt = modelSource.source_excerpt?.trim();
        if (
          modelSource.status === "user" ||
          (modelSource.status !== "lecture" && modelSource.status !== "edited") ||
          !source_excerpt ||
          !candidateExcerpts.has(source_excerpt)
        ) {
          return { index, text, status: "user" };
        }
        return {
          index,
          text,
          status: modelSource.status === "edited" ? "edited" : "lecture",
          source_excerpt,
        };
      });
    }
  } catch (err) {
    console.error("Edited source attribution failed; using fallback:", err);
  }

  const next = { ...content, bodySources: sources };
  const { data: updated, error: updateError } = await supabase
    .from("notes")
    .update({ content: next })
    .eq("id", id)
    .select("content")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Couldn't update note sources." },
      { status: 500 }
    );
  }

  return NextResponse.json({ content: updated.content as StructuredNotes });
}
