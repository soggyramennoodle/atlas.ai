import "server-only";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromUri,
  type Schema,
} from "@google/genai";
import type { StructuredNotes } from "./types";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

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
      description: "Thorough, ordered notes covering the full lecture.",
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          points: { type: Type.ARRAY, items: { type: Type.STRING } },
          subsections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                points: { type: Type.ARRAY, items: { type: Type.STRING } },
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
      description: "Key terms introduced in the lecture and their definitions.",
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
  },
  required: ["title", "summary", "sections", "keyConcepts"],
  propertyOrdering: ["title", "subject", "summary", "sections", "keyConcepts"],
};

const SYSTEM_PROMPT = `You are Atlas, a meticulous note-taker for university students.

You are given the audio of a lecture. The student did not take their own notes and is relying entirely on you, so your notes must be THOROUGH and COMPLETE. Do not skip details, examples, derivations, or asides that a diligent student would write down.

Produce a structured set of notes:
- "title": a clean, descriptive title for the lecture.
- "subject": the course or subject if you can tell (e.g. "Microeconomics"), otherwise "".
- "sections": the heart of the notes. Walk through the lecture in order. Each section has a "heading" and detailed "points" (full, self-contained bullet points — not fragments). Break long topics into "subsections" where it helps. Capture explanations, examples, formulas (write them in plain text/Unicode), numbers, names, dates, and anything stated as important or examinable.
- "keyConcepts": every important term or definition introduced, each with a clear definition. If the lecture introduces no formal terms, return an empty array.
- "summary": write this LAST, after the detailed notes — a short overview paragraph (3-5 sentences) of what the lecture covered.

Rules:
- Base everything strictly on the audio. Never invent facts, figures, or citations that were not said.
- If audio is unclear or inaudible in places, note that rather than guessing.
- Prefer clarity and completeness over brevity. It is better to over-capture than to lose a detail.
- Write in clear, neutral academic English.`;

interface GenerateArgs {
  bytes: Buffer | Uint8Array;
  mimeType: string;
}

/**
 * Uploads lecture audio to the Gemini Files API and returns thorough,
 * structured notes. Cleans up the uploaded file afterwards.
 */
export async function generateNotesFromAudio({
  bytes,
  mimeType,
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

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: createUserContent([
        createPartFromUri(uploaded.uri!, uploaded.mimeType!),
        "Take complete, structured notes on this lecture following your instructions.",
      ]),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: notesSchema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = JSON.parse(text) as StructuredNotes;
    if (!parsed.title || !Array.isArray(parsed.sections)) {
      throw new Error("Gemini returned notes in an unexpected format.");
    }
    return parsed;
  } finally {
    // Best-effort cleanup of the uploaded file.
    if (uploaded.name) {
      ai.files.delete({ name: uploaded.name }).catch(() => {});
    }
  }
}
