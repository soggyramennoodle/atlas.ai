import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";
import { notesToPlainText } from "@/lib/notes-html";
import type { StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Cap the source we send to the model so a very long transcript can't blow past
// the helper model's context window or balloon latency/cost.
const MAX_SOURCE_CHARS = 120_000;

const SYSTEM_PROMPT = `You are Atlas, writing the overview summary for a student's lecture notes.

Write a single, cohesive summary paragraph of what the lecture covered, in clear academic prose. Hard rules:
- 4 to 6 sentences maximum. Never exceed six sentences.
- No headings, no bullet points, no markdown — prose only.
- Base it strictly on the provided notes/transcript. Never invent facts.
- Capture the main themes and arc of the lecture, not minor asides.`;

/**
 * Streams a freshly generated overview summary for a note (§ summary §). The
 * full note content is read server-side (RLS-scoped) and fed to the helper
 * model, so the Gemini key never reaches the client and the client doesn't have
 * to ship the transcript back up. Plain-text stream, token by token.
 */
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

  // RLS guarantees this only returns a note the user owns.
  const { data: note, error } = await supabase
    .from("notes")
    .select("content")
    .eq("id", id)
    .single();

  if (error || !note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const content = note.content as StructuredNotes;
  let source = notesToPlainText(content);
  if (!source.trim()) {
    return NextResponse.json(
      { error: "There's nothing to summarize yet." },
      { status: 400 }
    );
  }
  if (source.length > MAX_SOURCE_CHARS) {
    source = source.slice(0, MAX_SOURCE_CHARS);
  }

  let iterator;
  try {
    const ai = getGeminiClient();
    iterator = await ai.models.generateContentStream({
      model: HELPER_MODEL,
      contents: `Here is the full lecture content. Write the summary.\n\n${source}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });
  } catch (err) {
    console.error("Summary regeneration failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach Atlas right now." },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of iterator) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch (err) {
        console.error("Summary stream interrupted:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
