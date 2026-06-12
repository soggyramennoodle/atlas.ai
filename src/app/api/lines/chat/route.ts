import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, LITE_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  line?: string;
  noteTitle?: string;
  subject?: string;
  summary?: string;
  sourceExcerpt?: string;
  messages?: ChatMessage[];
}

/**
 * Streaming chat scoped to a single note line (§ note-line chat). Structurally
 * mirrors /api/concepts/chat: auth'd so the Gemini key never reaches the client,
 * may use Google Search grounding, and streams plain-text tokens. The system
 * prompt is fed the line, its note context, and the lecture source excerpt so
 * Atlas can clarify / justify / expand exactly what the student is looking at.
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

  const { line, noteTitle, subject, summary, sourceExcerpt, messages } = body;
  if (!line || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Missing line or messages." },
      { status: 400 }
    );
  }

  const contextLines = [
    noteTitle ? `LECTURE: ${noteTitle}` : "",
    subject ? `SUBJECT: ${subject}` : "",
    summary ? `LECTURE SUMMARY: ${summary}` : "",
    sourceExcerpt ? `THIS LINE WAS DISTILLED FROM: "${sourceExcerpt}"` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemInstruction = `You are Atlas, a sharp, friendly study assistant helping a student understand ONE specific line from their own lecture notes.

THE NOTE LINE: "${line}"${contextLines ? `\n${contextLines}` : ""}

Rules:
- Stay tightly focused on this line and ideas directly related to it. If the student drifts far off-topic, answer briefly and gently steer back to the line.
- Be accurate and concrete. You may use web search to verify facts, add a current example, or go deeper.
- Be concise and conversational — a couple of short paragraphs at most unless the student asks for more.
- Reply in plain prose. No markdown headings, no bullet lists unless genuinely helpful.
- Write any math in LaTeX wrapped in $...$ (inline) or $$...$$ (display) — never Unicode approximations.`;

  // Trim history defensively and map to Gemini's content format.
  const contents = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Gemini 2.5 counts internal "thinking" tokens against maxOutputTokens, so
  // thinking is disabled and the cap is generous — otherwise thinking eats the
  // budget and even a long "Go deeper" answer streams in truncated mid-sentence.
  const generationConfig = {
    systemInstruction,
    temperature: 0.6,
    maxOutputTokens: 4096,
    thinkingConfig: { thinkingBudget: 0 },
  } as const;

  async function startStream() {
    const ai = getGeminiClient();
    // Try with Google Search grounding; fall back without it if unsupported.
    try {
      return await ai.models.generateContentStream({
        model: LITE_MODEL,
        contents,
        config: {
          ...generationConfig,
          tools: [{ googleSearch: {} }],
        },
      });
    } catch {
      return ai.models.generateContentStream({
        model: LITE_MODEL,
        contents,
        config: generationConfig,
      });
    }
  }

  let iterator;
  try {
    iterator = await startStream();
  } catch (err) {
    console.error("Line chat failed:", err);
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
        console.error("Line chat stream interrupted:", err);
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
