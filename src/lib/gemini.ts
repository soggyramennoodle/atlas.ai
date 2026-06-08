import "server-only";
import {
  FinishReason,
  GoogleGenAI,
  Type,
  createUserContent,
  createPartFromUri,
  createPartFromBase64,
  type GenerateContentResponse,
  type Schema,
} from "@google/genai";
import type { SegmentNotes, StructuredNotes } from "./types";
import { mergeSegmentNotes } from "./notes-compose";
import { GeminiSpendCapError, classifyGeminiError } from "./gemini-errors";

/**
 * The model used for note generation. Defaults to Gemini 2.5 Pro, which
 * produces materially more thorough, well-structured notes on long-form audio
 * than Flash (better long-context instruction following and reasoning).
 * Override with the GEMINI_MODEL env var.
 *
 * Fallback for cost/latency-sensitive setups: GEMINI_MODEL="gemini-2.5-flash".
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

/** Faster/cheaper model for per-segment transcription (compose stays on MODEL). */
const SEGMENT_MODEL =
  process.env.GEMINI_SEGMENT_MODEL || "gemini-2.5-flash";

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

/**
 * Guard against silent truncation. When the model stops because it hit the
 * output-token ceiling (`MAX_TOKENS`), the JSON it returned is cut off and would
 * otherwise blow up in `JSON.parse` with a cryptic error — or worse, parse into
 * a partial note. Surfacing it as a clear, retryable error keeps notes from
 * being quietly clipped (the same failure mode that once truncated key concepts).
 */
function ensureComplete(response: GenerateContentResponse, label: string) {
  const reason = response.candidates?.[0]?.finishReason;
  if (reason === FinishReason.MAX_TOKENS) {
    throw new Error(
      `Gemini ${label} response hit the output token limit before completing.`
    );
  }
}

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
        'A short overview paragraph (3-5 sentences) of the whole lecture. For very short but intelligible recordings, state that only limited content was heard and summarize only that content. Use exactly "There was not enough lecture content to generate notes." only when there are no intelligible lecture words.',
    },
    sections: {
      type: Type.ARRAY,
      description:
        'Exhaustive, ordered notes covering the full lecture. For very short but intelligible recordings, create a sparse "What was heard" section instead of inventing a fuller lecture. Return an empty array only when there are no intelligible lecture words.',
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
        "The full, verbatim transcript of the entire lecture audio, lightly cleaned of filler words and false starts but otherwise complete and faithful. For sparse or non-lecture audio, include only the words that were actually said.",
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

Critical content gate:
- Before writing any notes, decide whether the audio contains any intelligible lecture content. The hard insufficient-content response is reserved for silence, background noise, unintelligible audio, or non-lecture mic checks/greetings with no academic content.
- Short but real academic speech is enough to generate notes, even if it is only one sentence. For a very short recording, do not reject it. Create sparse notes that explicitly say only limited content was heard and that comprehensive notes cannot be made from the available audio.
- If there are no intelligible lecture words, do not infer a topic from memory, prior examples, filenames, background noise, or likely classroom context. Return the required JSON shape with:
  - "title": "Not enough lecture content"
  - "subject": ""
  - "summary": "There was not enough lecture content to generate notes."
  - "sections": []
  - "keyConcepts": []
  - "transcript": only the words actually spoken, or "" if no words are intelligible
- If only one sentence or a few sentences were heard, use a title like "Brief lecture excerpt", keep "subject" empty unless the subject is explicit, write a summary such as "Only a brief statement was captured...", create a short "What was heard" section, and include key concepts only if they were actually introduced in the audio.
- Never create placeholder lecture notes, plausible topics, sample material, or a transcript for words that were not actually spoken.

Your notes must be:
- Organized into sections and subsections that mirror the lecture's natural structure.
- Written in clear, precise academic language.
- Rich with detail: include every formula (write them in plain text/Unicode), every named theorem, every example, every edge case mentioned, every number, name, and date.
- Faithful to the professor's logic and sequencing — do not reorder or collapse content.
- Anchored in the professor's own language: lean on their exact terminology, phrasing, definitions, mnemonics, and analogies as much as makes sense. When the professor's specific wording carries meaning, keep it (quote or near-quote it) rather than paraphrasing it into generic language — paraphrasing is where precise, exam-relevant detail gets quietly lost. Use the transcript to recover the professor's actual words; only smooth over obvious transcription errors and filler.
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
- If the audio contains intelligible academic content but not enough material for comprehensive notes, say so in the summary and write sparse notes from only the heard content. Use the insufficient-content output only for silence, unintelligible audio, or non-academic mic checks/greetings with no note-worthy content.
- If audio is unclear or inaudible in places, note that rather than guessing.
- Prefer completeness over brevity. It is far better to over-capture than to lose a detail.`;

/** Schema for one ~5-minute segment: transcript + audio-grounded notes only. */
const segmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description:
        "The full, verbatim transcript of THIS audio segment only, lightly cleaned of filler/false starts.",
    },
    sections: notesSchema.properties!.sections,
    keyConcepts: notesSchema.properties!.keyConcepts,
  },
  required: ["transcript", "sections", "keyConcepts"],
  propertyOrdering: ["transcript", "sections", "keyConcepts"],
};

const SEGMENT_PROMPT = `${SYSTEM_PROMPT}

SEGMENT MODE: This audio is ONE ~5-minute slice of a longer lecture, not the whole thing. Take exhaustive, audio-grounded notes for THIS slice only:
- Do NOT write a title, subject, or overall summary — those are produced once for the whole lecture later.
- Do NOT emit the insufficient-content rejection. If this slice is sparse (e.g. a pause, transition, or the lecturer is mid-sentence from the previous slice), simply return the few sections/concepts/transcript that apply, or empty arrays and an empty/partial transcript. The whole-lecture judgement is made elsewhere.
- A point may continue a thought from the previous slice; that is fine — capture what is said here.
- "source_excerpt" must be a real quote from THIS audio.`;

const COMPOSE_PROMPT = `You are finalizing a student's lecture notes. You are given the already-extracted, audio-grounded notes for each consecutive segment of one lecture, in order, plus the stitched transcript for context. Your ONLY job is to produce the lecture-level framing and light reconciliation. Do NOT invent any content, fact, figure, or quote not present in the provided segment notes/transcript.

Return JSON with:
- "title": a clean, descriptive title for the WHOLE lecture.
- "subject": the course/subject if identifiable from the content, else "".
- "summary": a 3-5 sentence overview of the whole lecture, written from the provided notes.
- "sections": the provided sections, kept in order. You MAY merge two adjacent sections only when the later one is clearly a direct continuation of the previous (e.g. identical heading), preserving every point. Never drop points.
- "keyConcepts": the provided key concepts, deduplicated.

Do NOT echo the transcript back — it is reattached automatically, so spending output on it only risks truncating the notes. Use it only as context.

Insufficient-content rule (judged here, over the whole lecture): if the combined sections are empty and the transcript has no intelligible lecture words, return title "Not enough lecture content", subject "", summary "There was not enough lecture content to generate notes.", sections [], keyConcepts [].`;

/**
 * Compose output schema — the whole-lecture framing only. Deliberately omits
 * `transcript`: the stitched transcript is reattached deterministically from the
 * segments (see composeNotes), so the model never has to echo it. Echoing a long
 * transcript is the single biggest output-token sink and the most likely way the
 * composed JSON would hit the token ceiling and truncate.
 */
const composeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: notesSchema.properties!.title,
    subject: notesSchema.properties!.subject,
    summary: notesSchema.properties!.summary,
    sections: notesSchema.properties!.sections,
    keyConcepts: notesSchema.properties!.keyConcepts,
  },
  required: ["title", "summary", "sections", "keyConcepts"],
  propertyOrdering: ["title", "subject", "summary", "sections", "keyConcepts"],
};

/** Run a Gemini call, re-throwing a typed error when it is the spend cap. */
async function callGemini<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (classifyGeminiError(err) === "spend_cap") {
      throw new GeminiSpendCapError(
        err instanceof Error ? err.message : "Gemini monthly spending cap reached."
      );
    }
    throw err;
  }
}

interface SegmentArgs {
  bytes: Buffer | Uint8Array;
  mimeType: string;
  memoryContext?: string;
}

/**
 * Transcribe + take audio-grounded notes for a single ~5-minute segment.
 * Segments are small (<20 MB), so the audio is sent inline — no Files API
 * upload/ACTIVE wait — which keeps each call well under the 60s worker budget.
 */
export async function transcribeSegment({
  bytes,
  mimeType,
  memoryContext,
}: SegmentArgs): Promise<SegmentNotes> {
  const ai = getClient();
  const base64 = Buffer.from(bytes).toString("base64");

  const systemInstruction = memoryContext
    ? `${SEGMENT_PROMPT}\n\n--- About this student (personalization context) ---\n${memoryContext}\nUse this context to tailor terminology, depth, and emphasis. Never fabricate details to fit it.`
    : SEGMENT_PROMPT;

  const response = await callGemini(() =>
    ai.models.generateContent({
      model: SEGMENT_MODEL,
      contents: createUserContent([
        createPartFromBase64(base64, mimeType),
        "Transcribe and take exhaustive, audio-grounded notes on THIS lecture segment, following SEGMENT MODE.",
      ]),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: segmentSchema,
        temperature: 0,
      },
    })
  );

  ensureComplete(response, "segment");
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty segment response.");
  const parsed = JSON.parse(text) as SegmentNotes;
  if (!Array.isArray(parsed.sections) || typeof parsed.transcript !== "string") {
    throw new Error("Gemini returned a segment in an unexpected format.");
  }
  parsed.keyConcepts ??= [];
  return parsed;
}

interface ComposeArgs {
  segments: SegmentNotes[];
  memoryContext?: string;
}

/**
 * Reconcile ordered per-segment notes into the final whole-lecture
 * `StructuredNotes`. The structural merge (section order, concept dedupe,
 * transcript join) is done deterministically by `mergeSegmentNotes`; this LLM
 * pass only adds title/subject/summary and may merge directly-continuing
 * adjacent headings. Text-only, so it stays within the worker budget.
 */
export async function composeNotes({
  segments,
  memoryContext,
}: ComposeArgs): Promise<StructuredNotes> {
  const merged = mergeSegmentNotes(segments);
  const ai = getClient();

  const systemInstruction = memoryContext
    ? `${COMPOSE_PROMPT}\n\n--- About this student ---\n${memoryContext}`
    : COMPOSE_PROMPT;

  const response = await callGemini(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: createUserContent([
        JSON.stringify({
          sections: merged.sections,
          keyConcepts: merged.keyConcepts,
          transcript: merged.transcript,
        }),
      ]),
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: composeSchema,
        temperature: 0,
      },
    })
  );

  ensureComplete(response, "compose");
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty compose response.");
  const parsed = JSON.parse(text) as StructuredNotes;
  if (!parsed.title || !Array.isArray(parsed.sections)) {
    throw new Error("Gemini returned composed notes in an unexpected format.");
  }
  // The transcript is never echoed by the model (see composeSchema) — always
  // reattach the deterministically stitched one.
  parsed.transcript = merged.transcript;
  if (!parsed.keyConcepts?.length) parsed.keyConcepts = merged.keyConcepts;
  parsed.status = "ready";
  return parsed;
}

interface GenerateArgs {
  bytes: Buffer | Uint8Array;
  mimeType: string;
  /**
   * Optional personalization context built from the student's AI memory and
   * profile. Appended to the system prompt so notes adapt to the student.
   */
  memoryContext?: string;
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
  let uploaded = await callGemini(() =>
    ai.files.upload({
      file: blob,
      config: { mimeType },
    })
  );

  try {
    // Audio is processed asynchronously; wait until it is ACTIVE.
    const startedAt = Date.now();
    while (uploaded.state === "PROCESSING") {
      if (Date.now() - startedAt > 5 * 60_000) {
        throw new Error("Timed out waiting for Gemini to process the audio.");
      }
      await new Promise((r) => setTimeout(r, 2000));
      uploaded = await callGemini(() => ai.files.get({ name: uploaded.name! }));
    }

    if (uploaded.state === "FAILED") {
      throw new Error("Gemini failed to process the uploaded audio.");
    }

    const systemInstruction = memoryContext
      ? `${SYSTEM_PROMPT}\n\n--- About this student (personalization context) ---\n${memoryContext}\nUse this context to tailor terminology, depth, and emphasis. Never fabricate details to fit it.`
      : SYSTEM_PROMPT;

    const response = await callGemini(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: createUserContent([
          createPartFromUri(uploaded.uri!, uploaded.mimeType!),
          "Take complete, exhaustively detailed, structured notes on this lecture following your instructions. If the audio is very short but contains intelligible academic content, generate sparse notes from only what was heard and say that comprehensive notes cannot be made from the limited audio. Return the insufficient-content JSON only for silence, unintelligible audio, or non-academic mic checks/greetings with no note-worthy content.",
        ]),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: notesSchema,
          temperature: 0,
        },
      })
    );

    ensureComplete(response, "notes");
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
