import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, LITE_MODEL } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
  line?: string;
  /** The "go deeper" answer the student chose to fold into their notes. */
  deeper?: string;
  sourceExcerpt?: string;
  noteTitle?: string;
  subject?: string;
  summary?: string;
}

/**
 * Regenerate a single note line, folding a "go deeper" explanation back into
 * clean, note-style bullets (§ add-to-note). Rather than dumping the verbose
 * chat answer into the notes, the cheapest model rewrites the line — given the
 * original line, its lecture source, and the deeper explanation — into 1–3
 * dense bullets, streamed back as plain text (one bullet per line). Auth'd so
 * the Gemini key never reaches the client.
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

  const { line, deeper, sourceExcerpt, noteTitle, subject, summary } = body;
  if (!line || !deeper) {
    return NextResponse.json(
      { error: "Missing line or deeper explanation." },
      { status: 400 }
    );
  }

  const contextLines = [
    noteTitle ? `LECTURE: ${noteTitle}` : "",
    subject ? `SUBJECT: ${subject}` : "",
    summary ? `LECTURE SUMMARY: ${summary}` : "",
    sourceExcerpt ? `ORIGINAL LECTURE SOURCE: "${sourceExcerpt}"` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const instruction = `You are Atlas, helping a student improve ONE line in their lecture notes.

Rewrite the ORIGINAL NOTE LINE into a richer, clearer note that folds in the key detail from the DEEPER EXPLANATION. Integrate — don't just append. Keep everything the original line conveyed, made more complete and precise.

ORIGINAL NOTE LINE: "${line}"
DEEPER EXPLANATION:
${deeper}${contextLines ? `\n\n${contextLines}` : ""}

Output rules:
- Reply with 1 to 3 concise note bullets, whichever the content warrants.
- One bullet per line. Plain text only — no leading "-", "*", "•", numbers, or markdown.
- Dense and study-friendly: capture the substance, drop the filler. No preamble, no sign-off, don't address the student.`;

  // Gemini 2.5 counts internal "thinking" tokens against maxOutputTokens, so
  // thinking is disabled and the cap is generous — the rewrite must never clip.
  let iterator;
  try {
    const ai = getGeminiClient();
    iterator = await ai.models.generateContentStream({
      model: LITE_MODEL,
      contents: instruction,
      config: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (err) {
    console.error("Line expand failed:", err);
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
        console.error("Line expand stream interrupted:", err);
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
