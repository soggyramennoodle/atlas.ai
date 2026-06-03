import "server-only";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromUri,
  type Schema,
} from "@google/genai";
import type { StructuredNotes } from "./types";

/**
 * The preferred model used for note generation. Defaults to Gemini 2.5 Pro,
 * which produces materially more thorough, well-structured notes on long-form
 * audio than Flash (better long-context instruction following and reasoning).
 * Override with GEMINI_MODEL.
 *
 * If the preferred model is unavailable due to quota/rate/model-access issues,
 * Atlas retries once with GEMINI_FALLBACK_MODEL (default: Gemini 2.5 Flash).
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
const NOTE_MODELS = Array.from(new Set([MODEL, FALLBACK_MODEL].filter(Boolean)));

/** A lighter, cheaper model for short helper calls (explanations, edit diffs). */
export const HELPER_MODEL =
  process.env.GEMINI_HELPER_MODEL || "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

export { getClient as getGeminiClient };

/** A single note bullet: the text plus the transcript excerpt it came from. */
const pointSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "A full, self-contained note bullet (not a fragment).",
    },
    source_excerpt: {
      type: Type.STRING,
      description:
        "A short verbatim quote (one or two sentences) from the lecture transcript that this point was drawn from. Used to trace a note back to what the professor actually said.",
    },
  },
  required: ["text"],
  propertyOrdering: ["text", "source_excerpt"],
};

/** JSON schema that constrains Gemini's output to our StructuredNotes shape. */
const notesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A clean, descriptive title for the lecture.",
    },
    subject: {
      type: Type.STRING,
      description: "The course/subject if identifiable, else an empty string.",
    },
    summary: {
      type: Type.STRING,
      description:
        "A short overview paragraph (3-5 sentences) of the whole lecture.",
    },
    sections: {
      type: Type.ARRAY,
      description: "Exhaustive, ordered notes covering the full lecture.",
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          points: { type: Type.ARRAY, items: pointSchema },
          subsections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                points: { type: Type.ARRAY, items: pointSchema },
              },
              required: ["heading", "points"],
              propertyOrdering: ["heading", "points"],
            },
          },
        },
        required: ["heading", "points"],
        propertyOrdering: ["heading", "points", "subsections"],
      },
    },
    keyConcepts: {
      type: Type.ARRAY,
      description:
        "Every domain-specific term introduced in the lecture and its definition.",
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
        },
        required: ["term", "definition"],
        propertyOrdering: ["term", "definition"],
      },
    },
    transcript: {
      type: Type.STRING,
      description:
        "The full, verbatim transcript of the entire lecture audio, lightly cleaned of filler words and false starts but otherwise complete and faithful.",
    },
  },
  required: ["title", "summary", "sections", "keyConcepts", "transcript"],
  propertyOrdering: [
    "title",
    "subject",
    "summary",
    "sections",
    "keyConcepts",
    "transcript",
  ],
};

const SYSTEM_PROMPT = `You are an elite university note-taker attending this lecture on behalf of the student. Your job is NOT to summarize — a summary is generated separately. Your job is to take EXHAUSTIVELY DETAILED, STRUCTURED notes that capture virtually every concept, argument, example, derivation, definition, aside, and nuance the professor delivers. Nothing of academic relevance should be omitted. Write as if the student will use these notes alone to prepare for a final exam and will never re-listen to the lecture.

Your notes must be:
- Organized into sections and subsections that mirror the lecture's natural structure.
- Written in clear, precise academic language.
- Rich with detail: include every formula (write them in plain text/Unicode), every named theorem, every example, every edge case mentioned, every number, name, and date.
- Faithful to the professor's logic and sequencing — do not reorder or collapse content.
- Inclusive of transitional remarks that signal importance ("this is key", "remember this for the exam", "contrast this with X"). Preserve these cues in the relevant bullet.
- Supplemented with a "Key Concepts" block ("keyConcepts") at the end defining ALL domain-specific terminology introduced.

Output format:
- "title": a clean, descriptive title for the lecture.
- "subject": the course or subject if identifiable (e.g. "Microeconomics"), otherwise "".
- "sections": the heart of the notes. Walk through the lecture in order. Each section has a "heading" and detailed "points". Break long topics into "subsections" where it helps. Each point is an object: "text" is the full, self-contained bullet; "source_excerpt" is a short verbatim quote from the lecture that the point was drawn from.
- "keyConcepts": every important term or definition introduced, each with a clear definition. Empty array if none.
- "summary": a short overview paragraph (3-5 sentences) of what the lecture covered. Write this LAST.
- "transcript": the full, verbatim transcript of the entire lecture, lightly cleaned of filler/false starts but otherwise complete.

Rules:
- Base everything strictly on the audio. Never invent facts, figures, citations, or quotes that were not said. "source_excerpt" must be a real quote from the audio.
- If audio is unclear or inaudible in places, note that rather than guessing.
- Prefer completeness over brevity. It is far better to over-capture than to lose a detail.`;

interface GenerateArgs {
  bytes: Buffer | Uint8Array;
  mimeType: string;
  /**
   * Optional personalization context built from the student's AI memory and
   * profile. Appended to the system prompt so notes adapt to the student.
   */
  memoryContext?: string;
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Whether a model failure is worth retrying with the fallback model. */
function shouldTryFallback(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  return [
    "429",
    "resource_exhausted",
    "quota",
    "rate limit",
    "rate-limit",
    "permission_denied",
    "forbidden",
    "not found",
    "not_found",
    "model",
  ].some((needle) => text.includes(needle));
}

async function generateStructuredNotes({
  ai,
  model,
  fileUri,
  fileMimeType,
  systemInstruction,
}: {
  ai: GoogleGenAI;
  model: string;
  fileUri: string;
  fileMimeType: string;
  systemInstruction: string;
}): Promise<StructuredNotes> {
  const response = await ai.models.generateContent({
    model,
    contents: createUserContent([
      createPartFromUri(fileUri, fileMimeType),
      "Take complete, exhaustively detailed, structured notes on this lecture following your instructions.",
    ]),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: notesSchema,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(`Gemini returned an empty response from ${model}.`);
  }

  const parsed = JSON.parse(text) as StructuredNotes;
  if (!parsed.title || !Array.isArray(parsed.sections)) {
    throw new Error(`Gemini returned notes in an unexpected format from ${model}.`);
  }
  return parsed;
}

/**
 * Uploads lecture audio to the Gemini Files API and returns thorough,
 * structured notes. Cleans up the uploaded file afterwards.
 */
export async function generateNotesFromAudio({
  bytes,
  mimeType,
  memoryContext,
}: GenerateArgs): Promise<StructuredNotes> {
  const ai = getClient();

  // Copy into a fresh ArrayBuffer-backed view so it satisfies BlobPart.
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  let uploaded = await ai.files.upload({
    file: blob,
    config: { mimeType },
  });

  try {
    // Audio is processed asynchronously; wait until it is ACTIVE.
    const startedAt = Date.now();
    while (uploaded.state === "PROCESSING") {
      if (Date.now() - startedAt > 5 * 60_000) {
        throw new Error("Timed out waiting for Gemini to process the audio.");
      }
      await new Promise((r) => setTimeout(r, 2000));
      uploaded = await ai.files.get({ name: uploaded.name! });
    }

    if (uploaded.state === "FAILED") {
      throw new Error("Gemini failed to process the uploaded audio.");
    }

    const systemInstruction = memoryContext
      ? `${SYSTEM_PROMPT}\n\n--- About this student (personalization context) ---\n${memoryContext}\nUse this context to tailor terminology, depth, and emphasis. Never fabricate details to fit it.`
      : SYSTEM_PROMPT;

    let lastError: unknown;
    for (const [index, model] of NOTE_MODELS.entries()) {
      try {
        if (index > 0) {
          console.warn(
            `Retrying lecture note generation with fallback model ${model}.`
          );
        }
        return await generateStructuredNotes({
          ai,
          model,
          fileUri: uploaded.uri!,
          fileMimeType: uploaded.mimeType!,
          systemInstruction,
        });
      } catch (err) {
        lastError = err;
        const hasFallback = index < NOTE_MODELS.length - 1;
        if (!hasFallback || !shouldTryFallback(err)) {
          throw err;
        }
        console.warn(
          `Gemini note generation failed with ${model}; trying fallback model.`,
          err
        );
      }
    }

    throw lastError ?? new Error("Gemini note generation failed.");
  } finally {
    // Best-effort cleanup of the uploaded file.
    if (uploaded.name) {
      ai.files.delete({ name: uploaded.name }).catch(() => {});
    }
  }
}
