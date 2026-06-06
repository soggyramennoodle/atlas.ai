import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

type Mode = "simple" | "analogy" | "why";

const PROMPTS: Record<Mode, (term: string) => string> = {
  simple: (t) => `Explain the concept "${t}" as simply as possible, in plain language a first-year student would understand. 2-4 short sentences.`,
  analogy: (t) => `Give a single vivid, memorable analogy that explains the concept "${t}". Start with "Think of it like…". 2-4 sentences.`,
  why: (t) => `Explain why the concept "${t}" matters — its significance, where it's used, and why a student should care. 2-4 sentences.`,
};

/**
 * Streams a short Gemini explanation of a key concept (§9). Auth'd so the
 * Gemini key never reaches the client. Body: { term, definition, mode, context }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { term?: string; definition?: string; mode?: Mode; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { term, definition, mode = "simple", context } = body;
  if (!term || !PROMPTS[mode]) {
    return NextResponse.json({ error: "Missing term or mode." }, { status: 400 });
  }

  const instruction = `${PROMPTS[mode](term)}\n\nThe student's notes define it as: "${definition ?? ""}".${
    context ? `\nLecture context: ${context}` : ""
  }\nReply in prose only — no headings, no markdown bullets.`;

  let iterator;
  try {
    const ai = getGeminiClient();
    iterator = await ai.models.generateContentStream({
      model: HELPER_MODEL,
      contents: instruction,
      // Gemini 2.5 counts thinking tokens against maxOutputTokens; disable
      // thinking and keep a generous cap so the short reply never truncates.
      config: {
        temperature: 0.6,
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (err) {
    console.error("Concept explanation failed:", err);
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
        console.error("Stream interrupted:", err);
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
