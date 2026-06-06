import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, HELPER_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  term?: string;
  definition?: string;
  context?: string;
  messages?: ChatMessage[];
}

/**
 * Streaming chat for a single key concept (§2). The conversation is constrained
 * to the card's concept (passed as system context), may use Google Search
 * grounding for research, and streams tokens back as plain text. Auth'd so the
 * Gemini key never reaches the client.
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

  const { term, definition, context, messages } = body;
  if (!term || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Missing concept or messages." },
      { status: 400 }
    );
  }

  const systemInstruction = `You are Atlas, a sharp, friendly study assistant helping a student understand ONE specific concept from their lecture notes.

CONCEPT: "${term}"
THE STUDENT'S NOTES DEFINE IT AS: "${definition ?? ""}"${
    context ? `\nLECTURE CONTEXT: ${context}` : ""
  }

Rules:
- Stay tightly focused on this concept and ideas directly related to it. If the student drifts far off-topic, answer briefly and gently steer back to the concept.
- Be accurate and concrete. You may use web search to verify facts, add a current example, or go deeper.
- Be concise and conversational — a couple of short paragraphs at most unless the student asks for more.
- Reply in plain prose. No markdown headings, no bullet lists unless genuinely helpful.`;

  // Trim history defensively and map to Gemini's content format.
  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Gemini 2.5 models count internal "thinking" tokens against maxOutputTokens.
  // A short concept reply doesn't need extended reasoning, so thinking is
  // disabled and the budget is generous — otherwise thinking eats the cap and
  // the visible answer streams in truncated mid-sentence.
  const generationConfig = {
    systemInstruction,
    temperature: 0.6,
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingBudget: 0 },
  } as const;

  async function startStream() {
    const ai = getGeminiClient();
    // Try with Google Search grounding; fall back without it if unsupported.
    try {
      return await ai.models.generateContentStream({
        model: HELPER_MODEL,
        contents,
        config: {
          ...generationConfig,
          tools: [{ googleSearch: {} }],
        },
      });
    } catch {
      return ai.models.generateContentStream({
        model: HELPER_MODEL,
        contents,
        config: generationConfig,
      });
    }
  }

  let iterator;
  try {
    iterator = await startStream();
  } catch (err) {
    console.error("Concept chat failed:", err);
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
        console.error("Concept chat stream interrupted:", err);
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
