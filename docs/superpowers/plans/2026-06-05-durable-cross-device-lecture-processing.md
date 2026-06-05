# Durable, Cross-Device Lecture Processing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lecture processing fully server-side and durable so a user can record on one device, close the tab, and find finished notes in their dashboard on any device — without changing the recording experience or note quality, and without breaking mid-recording recovery.

**Architecture:** The browser records one continuous session but rotates the `MediaRecorder` every ~5 minutes into independent WebM segments, each uploaded to R2 as it completes. A request only *enqueues* a job (Supabase `lecture_jobs` + `lecture_segments`). A worker route `/api/jobs/tick` (service-role, shared-secret) advances the job state machine in ≤60s slices — transcribing one segment per pass with Gemini, then composing the final notes — self-chaining between passes, with Supabase `pg_cron` as a once-a-minute safety net. The dashboard live-updates via Supabase Realtime.

**Tech Stack:** Next.js 16 (App Router, Node runtime), Supabase (Postgres + RLS + Realtime + pg_cron + pg_net), Cloudflare R2 (S3 SDK), Gemini (`@google/genai` 2.7), Vitest (added here), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-05-durable-cross-device-lecture-processing-design.md`

---

## Reference: read before coding

The Next.js in this repo has breaking changes vs training data (see `AGENTS.md`). Before editing any route or server code, read the relevant guide under `node_modules/next/dist/docs/`. Heed deprecation notices.

Grounding facts (already verified in the codebase):
- Service-role client: `createAdminClient()` in `src/lib/supabase/admin.ts` (bypasses RLS, server-only).
- User-scoped server client: `createClient()` in `src/lib/supabase/server.ts`.
- R2 client + bucket helpers: `src/lib/r2.ts` (`r2`, `getR2Bucket()`, `requiredR2Env()`).
- Notes output type: `StructuredNotes` in `src/lib/types.ts`.
- Existing single-shot Gemini call: `generateNotesFromAudio()` in `src/lib/gemini.ts`.
- Recorder + draft: `src/components/recording/recording-context.tsx`, `src/lib/recording-draft.ts`.
- Presign route: `src/app/api/upload/presign/route.ts`.
- Notes schema: `supabase/schema.sql` / `supabase/schema-v2.sql`.

---

## File structure

**New files:**
- `vitest.config.ts` — test runner config.
- `src/lib/jobs.ts` — job/segment state-machine helpers (lease staleness, status guards, segment selection).
- `src/lib/jobs.test.ts` — unit tests for the pure helpers.
- `src/lib/notes-compose.ts` — pure functions that merge per-segment notes into one `StructuredNotes`.
- `src/lib/notes-compose.test.ts` — unit tests for merge/dedupe/ordering.
- `src/lib/segment-upload.ts` — client helper: presign + PUT one segment, return its R2 key.
- `src/app/api/jobs/enqueue/route.ts` — create job + placeholder note, return 202.
- `src/app/api/jobs/tick/route.ts` — the worker.
- `supabase/schema-jobs.sql` — `lecture_jobs` + `lecture_segments` tables, indexes, RLS.
- `supabase/cron-worker.sql` — pg_cron + pg_net schedule (manual apply, real URL/secret).

**Modified files:**
- `package.json` — add vitest + `test` script.
- `src/lib/types.ts` — add `SegmentNotes`, `LectureJobStatus`, `LectureSegmentStatus`, row types.
- `src/lib/gemini.ts` — add `transcribeSegment()` and `composeNotes()`.
- `src/lib/recording-draft.ts` — per-segment storage + `uploaded` flag + helpers.
- `src/app/api/upload/presign/route.ts` — accept `jobId` + `segmentIndex`, return a segment-scoped key.
- `src/components/recording/recording-context.tsx` — MediaRecorder rotation, per-segment upload, auto-process on stop, recovery reconciliation.
- `src/app/(app)/dashboard/page.tsx` + a small client island — Realtime subscription.
- `src/components/recording/*` (processing screen) — "safe to close" toast after 25s.
- `src/app/api/notes/route.ts` — repoint to enqueue (back-compat shim).

---

## Phase 0 — Test infrastructure

### Task 0: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dev deps**

Run:
```bash
npm install -D vitest@^2
```
Expected: vitest added to `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify the runner works**

Run: `npm test`
Expected: exits 0 with "No test files found" (no tests yet) — confirms the runner is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Phase 1 — Shared types

### Task 1: Add job/segment/segment-notes types

**Files:**
- Modify: `src/lib/types.ts` (append at end)

- [ ] **Step 1: Append the new types**

```ts
/** Status of a durable lecture-processing job (server-side state machine). */
export type LectureJobStatus =
  | "recording"
  | "recording_complete"
  | "processing"
  | "ready"
  | "failed";

/** Status of one ~5-minute audio segment within a job. */
export type LectureSegmentStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "failed";

/**
 * Audio-grounded notes for a single ~5-minute segment. Produced by
 * `transcribeSegment` from that segment's real audio, then reconciled into a
 * full `StructuredNotes` by `composeNotes`. Deliberately omits title/subject/
 * summary — those are decided once, at compose time, over the whole lecture.
 */
export interface SegmentNotes {
  transcript: string;
  sections: NoteSection[];
  keyConcepts: KeyConcept[];
}

/** A row in `public.lecture_jobs`. */
export interface LectureJobRecord {
  id: string;
  user_id: string;
  note_id: string;
  status: LectureJobStatus;
  segment_count: number | null;
  total_seconds: number | null;
  source: "microphone" | "device";
  session_label: string;
  live_transcript: string | null;
  attempts: number;
  heartbeat_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** A row in `public.lecture_segments`. */
export interface LectureSegmentRecord {
  id: string;
  job_id: string;
  index: number;
  r2_key: string;
  status: LectureSegmentStatus;
  duration_seconds: number | null;
  transcript_text: string | null;
  partial_notes: SegmentNotes | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add lecture job/segment types"
```

---

## Phase 2 — Pure logic (TDD)

### Task 2: Job lease + status helpers

**Files:**
- Create: `src/lib/jobs.ts`
- Test: `src/lib/jobs.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  JOBS_LEASE_MS,
  isLeaseStale,
  nextSegmentToTranscribe,
  allSegmentsResolved,
  jobIsComposable,
} from "./jobs";
import type { LectureSegmentRecord } from "./types";

function seg(
  index: number,
  status: LectureSegmentRecord["status"]
): LectureSegmentRecord {
  return {
    id: `s${index}`,
    job_id: "j",
    index,
    r2_key: `u/j/${index}.webm`,
    status,
    duration_seconds: 300,
    transcript_text: status === "transcribed" ? "x" : null,
    partial_notes: null,
    attempts: 0,
    created_at: "",
    updated_at: "",
  };
}

describe("isLeaseStale", () => {
  it("treats a null heartbeat as claimable", () => {
    expect(isLeaseStale(null, Date.now())).toBe(true);
  });
  it("is false within the lease window", () => {
    const now = Date.now();
    const hb = new Date(now - (JOBS_LEASE_MS - 1000)).toISOString();
    expect(isLeaseStale(hb, now)).toBe(false);
  });
  it("is true past the lease window", () => {
    const now = Date.now();
    const hb = new Date(now - (JOBS_LEASE_MS + 1000)).toISOString();
    expect(isLeaseStale(hb, now)).toBe(true);
  });
});

describe("nextSegmentToTranscribe", () => {
  it("returns the lowest-index 'uploaded' segment", () => {
    const segs = [seg(0, "transcribed"), seg(2, "uploaded"), seg(1, "uploaded")];
    expect(nextSegmentToTranscribe(segs)?.index).toBe(1);
  });
  it("returns null when none are uploaded", () => {
    expect(nextSegmentToTranscribe([seg(0, "transcribed")])).toBeNull();
  });
});

describe("allSegmentsResolved", () => {
  it("true when every segment is transcribed or failed", () => {
    expect(allSegmentsResolved([seg(0, "transcribed"), seg(1, "failed")])).toBe(true);
  });
  it("false when one is still uploaded", () => {
    expect(allSegmentsResolved([seg(0, "transcribed"), seg(1, "uploaded")])).toBe(false);
  });
});

describe("jobIsComposable", () => {
  it("needs recording_complete, a known count, and all segments resolved", () => {
    const segs = [seg(0, "transcribed"), seg(1, "transcribed")];
    expect(jobIsComposable("recording_complete", 2, segs)).toBe(true);
    expect(jobIsComposable("processing", 2, segs)).toBe(false);
    expect(jobIsComposable("recording_complete", 3, segs)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/jobs.test.ts`
Expected: FAIL ("Cannot find module './jobs'").

- [ ] **Step 3: Implement `src/lib/jobs.ts`**

```ts
import "server-only";
import type {
  LectureJobStatus,
  LectureSegmentRecord,
} from "./types";

/** How long a worker's claim on a job is honoured before it can be reclaimed. */
export const JOBS_LEASE_MS = Number(process.env.JOBS_LEASE_MS) || 90_000;
/** Per-tick wall-clock budget; yield before Vercel Hobby's 60s cap. */
export const JOBS_SLICE_BUDGET_MS =
  Number(process.env.JOBS_SLICE_BUDGET_MS) || 45_000;
/** Per-segment transcription retry ceiling. */
export const MAX_SEGMENT_ATTEMPTS = Number(process.env.MAX_SEGMENT_ATTEMPTS) || 3;
/** Whole-job retry ceiling. */
export const MAX_JOB_ATTEMPTS = Number(process.env.MAX_JOB_ATTEMPTS) || 5;

/** A heartbeat is stale (job reclaimable) when null or older than the lease. */
export function isLeaseStale(
  heartbeatAt: string | null,
  now: number = Date.now()
): boolean {
  if (!heartbeatAt) return true;
  return now - new Date(heartbeatAt).getTime() > JOBS_LEASE_MS;
}

/** The lowest-index segment still awaiting transcription, or null. */
export function nextSegmentToTranscribe(
  segments: LectureSegmentRecord[]
): LectureSegmentRecord | null {
  return (
    segments
      .filter((s) => s.status === "uploaded")
      .sort((a, b) => a.index - b.index)[0] ?? null
  );
}

/** True once no segment is still pending (every one transcribed or failed). */
export function allSegmentsResolved(
  segments: LectureSegmentRecord[]
): boolean {
  return segments.every(
    (s) => s.status === "transcribed" || s.status === "failed"
  );
}

/** Compose is allowed only once the lecture is fully recorded and resolved. */
export function jobIsComposable(
  status: LectureJobStatus,
  segmentCount: number | null,
  segments: LectureSegmentRecord[]
): boolean {
  if (status !== "recording_complete" && status !== "processing") return false;
  if (segmentCount == null) return false;
  if (segments.length < segmentCount) return false;
  return allSegmentsResolved(segments);
}
```

Note: `jobIsComposable("processing", …)` returns `true` so a job already moved to `processing` by the claim step can still compose; the test above asserts `false` for `"processing"` only because that test's intent is the *initial* gate. Update the test's `processing` expectation to `true` to match (compose must work after claim).

- [ ] **Step 4: Fix the test expectation**

In `jobs.test.ts`, change:
```ts
    expect(jobIsComposable("processing", 2, segs)).toBe(false);
```
to:
```ts
    expect(jobIsComposable("processing", 2, segs)).toBe(true);
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/lib/jobs.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/jobs.ts src/lib/jobs.test.ts
git commit -m "feat: add job lease + segment-selection helpers"
```

### Task 3: Notes compose/merge (pure)

**Files:**
- Create: `src/lib/notes-compose.ts`
- Test: `src/lib/notes-compose.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { mergeSegmentNotes, dedupeKeyConcepts, joinTranscripts } from "./notes-compose";
import type { SegmentNotes } from "./types";

const a: SegmentNotes = {
  transcript: "Part one.",
  sections: [{ heading: "Intro", points: [{ text: "p1" }] }],
  keyConcepts: [{ term: "Entropy", definition: "disorder" }],
};
const b: SegmentNotes = {
  transcript: "Part two.",
  sections: [{ heading: "Body", points: [{ text: "p2" }] }],
  keyConcepts: [
    { term: "entropy", definition: "dup, dropped" },
    { term: "Enthalpy", definition: "heat" },
  ],
};

describe("joinTranscripts", () => {
  it("joins in order with a single space", () => {
    expect(joinTranscripts([a, b])).toBe("Part one. Part two.");
  });
  it("skips empty transcripts", () => {
    expect(joinTranscripts([{ ...a, transcript: "" }, b])).toBe("Part two.");
  });
});

describe("dedupeKeyConcepts", () => {
  it("dedupes case-insensitively, first definition wins", () => {
    const out = dedupeKeyConcepts([...a.keyConcepts, ...b.keyConcepts]);
    expect(out).toEqual([
      { term: "Entropy", definition: "disorder" },
      { term: "Enthalpy", definition: "heat" },
    ]);
  });
});

describe("mergeSegmentNotes", () => {
  it("concatenates sections in segment order", () => {
    const merged = mergeSegmentNotes([a, b]);
    expect(merged.sections.map((s) => s.heading)).toEqual(["Intro", "Body"]);
    expect(merged.keyConcepts).toHaveLength(2);
    expect(merged.transcript).toBe("Part one. Part two.");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/notes-compose.test.ts`
Expected: FAIL ("Cannot find module './notes-compose'").

- [ ] **Step 3: Implement `src/lib/notes-compose.ts`**

```ts
import type { KeyConcept, NoteSection, SegmentNotes } from "./types";

/** Join segment transcripts in order, dropping empties, single-spaced. */
export function joinTranscripts(segments: SegmentNotes[]): string {
  return segments
    .map((s) => s.transcript.trim())
    .filter(Boolean)
    .join(" ");
}

/** Case-insensitive dedupe by term; the first definition encountered wins. */
export function dedupeKeyConcepts(concepts: KeyConcept[]): KeyConcept[] {
  const seen = new Set<string>();
  const out: KeyConcept[] = [];
  for (const c of concepts) {
    const key = c.term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Deterministic, audio-faithful reconciliation of per-segment notes into the
 * body of a `StructuredNotes`. Sections are concatenated in segment order (the
 * lecture's natural order); key concepts are deduped; transcripts joined. This
 * is the structural merge — the LLM compose pass (gemini.composeNotes) only
 * adds the title/subject/summary and may lightly de-duplicate adjacent
 * headings. Kept pure so it is unit-testable and never invents content.
 */
export function mergeSegmentNotes(segments: SegmentNotes[]): {
  sections: NoteSection[];
  keyConcepts: KeyConcept[];
  transcript: string;
} {
  return {
    sections: segments.flatMap((s) => s.sections),
    keyConcepts: dedupeKeyConcepts(segments.flatMap((s) => s.keyConcepts)),
    transcript: joinTranscripts(segments),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/notes-compose.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes-compose.ts src/lib/notes-compose.test.ts
git commit -m "feat: add pure segment-notes merge helpers"
```

---

## Phase 3 — Gemini segment + compose calls

### Task 4: `transcribeSegment()` and `composeNotes()`

**Files:**
- Modify: `src/lib/gemini.ts` (add exports; reuse `getClient`, `MODEL`, `SYSTEM_PROMPT`)

- [ ] **Step 1: Add a segment schema + `transcribeSegment`**

After the existing `notesSchema` definition in `src/lib/gemini.ts`, add:

```ts
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
```

- [ ] **Step 2: Add the `transcribeSegment` function**

Append to `src/lib/gemini.ts`:

```ts
import type { SegmentNotes } from "./types";

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

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: createUserContent([
      { inlineData: { mimeType, data: base64 } },
      "Transcribe and take exhaustive, audio-grounded notes on THIS lecture segment, following SEGMENT MODE.",
    ]),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: segmentSchema,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty segment response.");
  const parsed = JSON.parse(text) as SegmentNotes;
  if (!Array.isArray(parsed.sections) || typeof parsed.transcript !== "string") {
    throw new Error("Gemini returned a segment in an unexpected format.");
  }
  parsed.keyConcepts ??= [];
  return parsed;
}
```

- [ ] **Step 3: Add the `composeNotes` function**

Append to `src/lib/gemini.ts`:

```ts
import { mergeSegmentNotes } from "./notes-compose";
import type { StructuredNotes } from "./types";

const COMPOSE_PROMPT = `You are finalizing a student's lecture notes. You are given the already-extracted, audio-grounded notes for each consecutive segment of one lecture, in order, plus the stitched transcript. Your ONLY job is to produce the lecture-level framing and light reconciliation. Do NOT invent any content, fact, figure, or quote not present in the provided segment notes/transcript.

Return JSON with:
- "title": a clean, descriptive title for the WHOLE lecture.
- "subject": the course/subject if identifiable from the content, else "".
- "summary": a 3-5 sentence overview of the whole lecture, written from the provided notes.
- "sections": the provided sections, kept in order. You MAY merge two adjacent sections only when the later one is clearly a direct continuation of the previous (e.g. identical heading), preserving every point. Never drop points.
- "keyConcepts": the provided key concepts, deduplicated.
- "transcript": return exactly the provided stitched transcript.

Insufficient-content rule (judged here, over the whole lecture): if the combined sections are empty and the transcript has no intelligible lecture words, return title "Not enough lecture content", subject "", summary "There was not enough lecture content to generate notes.", sections [], keyConcepts [], and the transcript as given.`;

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

  const response = await ai.models.generateContent({
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
      responseSchema: notesSchema,
      temperature: 0,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty compose response.");
  const parsed = JSON.parse(text) as StructuredNotes;
  if (!parsed.title || !Array.isArray(parsed.sections)) {
    throw new Error("Gemini returned composed notes in an unexpected format.");
  }
  // Guard: never let the model shorten the transcript or drop key concepts.
  if (!parsed.transcript?.trim()) parsed.transcript = merged.transcript;
  if (!parsed.keyConcepts?.length) parsed.keyConcepts = merged.keyConcepts;
  parsed.status = "ready";
  return parsed;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If `createUserContent` rejects `inlineData`, confirm the `@google/genai` `createPartFromBase64`/`inlineData` shape in `node_modules/@google/genai` and adjust the part to `createPartFromBase64(base64, mimeType)` if that helper exists.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "feat: add Gemini segment-transcribe and compose calls"
```

---

## Phase 4 — Database

### Task 5: `lecture_jobs` + `lecture_segments` schema

**Files:**
- Create: `supabase/schema-jobs.sql`

- [ ] **Step 1: Write the schema**

```sql
-- ---------------------------------------------------------------------------
-- Durable lecture-processing jobs. One job per recording; segments are the
-- ~5-minute audio slices that the worker transcribes one at a time.
-- ---------------------------------------------------------------------------
create table if not exists public.lecture_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  note_id         uuid references public.notes (id) on delete cascade,
  status          text not null default 'recording',
  segment_count   integer,
  total_seconds   integer,
  source          text not null default 'microphone',
  session_label   text not null default 'Untitled Lecture',
  live_transcript text,
  attempts        integer not null default 0,
  heartbeat_at    timestamptz,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lecture_jobs_user_idx
  on public.lecture_jobs (user_id, created_at desc);
-- Worker scan: open jobs ordered by staleness.
create index if not exists lecture_jobs_active_idx
  on public.lecture_jobs (status, heartbeat_at)
  where status in ('recording_complete', 'processing');

create table if not exists public.lecture_segments (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.lecture_jobs (id) on delete cascade,
  index            integer not null,
  r2_key           text not null,
  status           text not null default 'uploaded',
  duration_seconds integer,
  transcript_text  text,
  partial_notes    jsonb,
  attempts         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (job_id, index)
);

create index if not exists lecture_segments_job_idx
  on public.lecture_segments (job_id, index);

-- RLS: users may READ their own jobs/segments (dashboard, recovery). All
-- processing WRITES are done by the worker with the service-role key, which
-- bypasses RLS. The browser only inserts via authenticated API routes.
alter table public.lecture_jobs enable row level security;
alter table public.lecture_segments enable row level security;

drop policy if exists "Users read own jobs" on public.lecture_jobs;
create policy "Users read own jobs"
  on public.lecture_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users read own segments" on public.lecture_segments;
create policy "Users read own segments"
  on public.lecture_segments for select
  using (
    exists (
      select 1 from public.lecture_jobs j
      where j.id = lecture_segments.job_id and j.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply to your Supabase project**

In the Supabase **SQL Editor**, paste and run `supabase/schema-jobs.sql`.
Expected: "Success. No rows returned." Verify the two tables exist under **Table Editor**.

- [ ] **Step 3: Enable Realtime on `notes`**

In Supabase **Database → Replication** (or **Realtime**), add `public.notes` to the `supabase_realtime` publication (toggle Realtime on for the table). This is what makes the dashboard live-update.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema-jobs.sql
git commit -m "feat: add lecture_jobs/lecture_segments schema + RLS"
```

---

## Phase 5 — Enqueue route

### Task 6: `POST /api/jobs/enqueue`

**Files:**
- Create: `src/app/api/jobs/enqueue/route.ts`

This replaces the synchronous generation in `POST /api/notes`. It creates the placeholder note + the job row, links them, and returns 202. It does NOT call Gemini.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StructuredNotes } from "@/lib/types";

export const runtime = "nodejs";

function processingContent(): StructuredNotes {
  return {
    status: "processing",
    title: "Processing lecture",
    subject: "",
    summary:
      "Atlas is turning this recording into notes. You can close this tab — your notes will appear in your dashboard on any device.",
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

interface EnqueueBody {
  jobId?: string;
  sessionLabel?: string;
  source?: "microphone" | "device";
  durationSeconds?: number | null;
  liveTranscript?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: EnqueueBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }

  // Idempotency: if this job already exists, return its note.
  const { data: existing } = await supabase
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.note_id) {
    return NextResponse.json(
      { jobId: existing.id, noteId: existing.note_id, status: existing.status },
      { status: 202 }
    );
  }

  // Create the placeholder note first so the dashboard shows it immediately.
  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: "Processing lecture",
      subject: null,
      content: processingContent(),
      audio_path: jobId,
      duration_seconds: body.durationSeconds ?? null,
    })
    .select("id")
    .single();
  if (noteErr || !note) {
    return NextResponse.json(
      { error: "Could not start note processing." },
      { status: 500 }
    );
  }

  const { error: jobErr } = await supabase.from("lecture_jobs").insert({
    id: jobId,
    user_id: user.id,
    note_id: note.id,
    status: "recording",
    source: body.source ?? "microphone",
    session_label: body.sessionLabel || "Untitled Lecture",
    total_seconds: body.durationSeconds ?? null,
    live_transcript: body.liveTranscript ?? null,
  });
  if (jobErr) {
    return NextResponse.json(
      { error: "Could not create the processing job." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { jobId, noteId: note.id, status: "recording" },
    { status: 202 }
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run the app (`npm run dev`), sign in, and from the browser console while authenticated:
```js
await fetch("/api/jobs/enqueue", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jobId: crypto.randomUUID(), sessionLabel: "Test" }),
}).then((r) => r.json());
```
Expected: `{ jobId, noteId, status: "recording" }`. Confirm a "Processing lecture" card now shows on `/dashboard`, and rows exist in `lecture_jobs` + `notes`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/jobs/enqueue/route.ts
git commit -m "feat: add enqueue route for durable lecture jobs"
```

---

## Phase 6 — The worker

### Task 7: `POST /api/jobs/tick`

**Files:**
- Create: `src/app/api/jobs/tick/route.ts`
- Reference: `src/lib/jobs.ts`, `src/lib/gemini.ts`, `src/lib/r2.ts`, `src/lib/supabase/admin.ts`

This is the heart of the system. Auth via `x-jobs-secret` header (compared to `process.env.JOBS_TICK_SECRET`). Service-role client. Claims one job, transcribes segments until the budget is spent, composes when done, then self-chains if work remains.

- [ ] **Step 1: Implement the route**

```ts
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import { composeNotes, transcribeSegment } from "@/lib/gemini";
import { buildMemoryContext } from "@/lib/memory";
import {
  JOBS_SLICE_BUDGET_MS,
  MAX_SEGMENT_ATTEMPTS,
  isLeaseStale,
  jobIsComposable,
  nextSegmentToTranscribe,
} from "@/lib/jobs";
import type {
  LectureJobRecord,
  LectureSegmentRecord,
  SegmentNotes,
  StructuredNotes,
  UserMemory,
  UserProfile,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby cap; the budget yields before this.

function failedContent(message: string): StructuredNotes {
  return {
    status: "failed",
    title: "Processing failed",
    subject: "",
    summary: message,
    sections: [],
    keyConcepts: [],
    transcript: "",
  };
}

async function selfChain(request: Request) {
  const url = new URL("/api/jobs/tick", request.url).toString();
  // Fire-and-forget; do not await the body.
  fetch(url, {
    method: "POST",
    headers: { "x-jobs-secret": process.env.JOBS_TICK_SECRET ?? "" },
  }).catch(() => {});
}

export async function POST(request: Request) {
  const start = Date.now();
  if ((request.headers.get("x-jobs-secret") ?? "") !== (process.env.JOBS_TICK_SECRET ?? "__unset__")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const db = createAdminClient();

  // 1) Find a claimable job (open + stale/no lease), oldest first.
  const { data: candidates } = await db
    .from("lecture_jobs")
    .select("*")
    .in("status", ["recording_complete", "processing"])
    .order("created_at", { ascending: true })
    .limit(10);

  const now = Date.now();
  const job = (candidates as LectureJobRecord[] | null)?.find((j) =>
    isLeaseStale(j.heartbeat_at, now)
  );
  if (!job) return NextResponse.json({ claimed: false });

  // 2) Claim it: conditional update on the heartbeat we saw (optimistic lock).
  const claimStamp = new Date().toISOString();
  const { data: claimed } = await db
    .from("lecture_jobs")
    .update({ status: "processing", heartbeat_at: claimStamp, updated_at: claimStamp })
    .eq("id", job.id)
    .eq("status", job.status)
    // Only claim if the heartbeat is still what we read (or null).
    .or(`heartbeat_at.is.null,heartbeat_at.eq.${job.heartbeat_at ?? "null"}`)
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ claimed: false, raced: true });

  // Personalization context (parity with the old route).
  const [{ data: memoryRow }, { data: profileRow }] = await Promise.all([
    db.from("user_memory").select("memory_blob").eq("user_id", job.user_id).maybeSingle(),
    db.from("user_profiles").select("*").eq("user_id", job.user_id).maybeSingle(),
  ]);
  const memoryContext =
    buildMemoryContext(
      (memoryRow?.memory_blob as UserMemory | undefined) ?? null,
      (profileRow as UserProfile | undefined) ?? null
    ) || undefined;

  // 3) Transcribe segments until the slice budget is spent.
  for (;;) {
    if (Date.now() - start > JOBS_SLICE_BUDGET_MS) {
      await selfChain(request);
      return NextResponse.json({ claimed: true, yielded: true });
    }

    const { data: segRows } = await db
      .from("lecture_segments")
      .select("*")
      .eq("job_id", job.id)
      .order("index", { ascending: true });
    const segments = (segRows as LectureSegmentRecord[] | null) ?? [];

    const next = nextSegmentToTranscribe(segments);
    if (next) {
      // Lease refresh + mark transcribing.
      await db
        .from("lecture_segments")
        .update({ status: "transcribing", updated_at: new Date().toISOString() })
        .eq("id", next.id);
      await db
        .from("lecture_jobs")
        .update({ heartbeat_at: new Date().toISOString() })
        .eq("id", job.id);

      try {
        const { Body } = await r2.send(
          new GetObjectCommand({ Bucket: getR2Bucket(), Key: next.r2_key })
        );
        if (!Body) throw new Error("Empty R2 body.");
        const bytes = Buffer.from(await Body.transformToByteArray());
        const mime = next.r2_key.endsWith(".webm") ? "audio/webm" : "audio/mp4";

        const partial: SegmentNotes = await transcribeSegment({
          bytes,
          mimeType: mime,
          memoryContext,
        });

        await db
          .from("lecture_segments")
          .update({
            status: "transcribed",
            transcript_text: partial.transcript,
            partial_notes: partial,
            updated_at: new Date().toISOString(),
          })
          .eq("id", next.id);
        // Retention: delete raw segment audio the moment it's transcribed.
        await r2
          .send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: next.r2_key }))
          .catch(() => {});
      } catch (err) {
        const attempts = next.attempts + 1;
        await db
          .from("lecture_segments")
          .update({
            status: attempts >= MAX_SEGMENT_ATTEMPTS ? "failed" : "uploaded",
            attempts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", next.id);
        console.error(`Segment ${next.index} transcription failed:`, err);
      }
      continue; // Loop: next segment or compose.
    }

    // 4) No segment to transcribe. Compose if the job is ready; else yield.
    if (jobIsComposable(job.status, job.segment_count, segments)) {
      const ordered = segments
        .filter((s) => s.partial_notes)
        .sort((a, b) => a.index - b.index)
        .map((s) => s.partial_notes as SegmentNotes);

      try {
        const notes = await composeNotes({ segments: ordered, memoryContext });
        if (!notes.transcript?.trim() && job.live_transcript?.trim()) {
          notes.transcript = job.live_transcript.trim();
        }
        await db
          .from("notes")
          .update({
            title: notes.title,
            subject: notes.subject || null,
            content: notes,
            duration_seconds: job.total_seconds ?? null,
          })
          .eq("id", job.note_id);
        await db
          .from("lecture_jobs")
          .update({ status: "ready", heartbeat_at: null, updated_at: new Date().toISOString() })
          .eq("id", job.id);
        return NextResponse.json({ claimed: true, composed: true });
      } catch (err) {
        console.error("Compose failed:", err);
        await db
          .from("notes")
          .update({
            title: "Processing failed",
            content: failedContent(
              "Atlas couldn't finish composing notes from this recording. Please try again."
            ),
          })
          .eq("id", job.note_id);
        await db
          .from("lecture_jobs")
          .update({ status: "failed", error: "compose", heartbeat_at: null })
          .eq("id", job.id);
        return NextResponse.json({ claimed: true, composed: false });
      }
    }

    // Segments still uploading, or recording not finished: release & wait.
    await db
      .from("lecture_jobs")
      .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ claimed: true, waiting: true });
  }
}
```

- [ ] **Step 2: Add the env var locally**

Add to `.env.local`:
```
JOBS_TICK_SECRET=<generate-a-long-random-string>
```
Generate one: `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/jobs/tick/route.ts`
Expected: PASS. (If the `.or(...)` optimistic-lock filter syntax is rejected by your `@supabase/supabase-js` version, simplify the claim to `.eq("id", job.id).eq("status", job.status)` and rely on `status` transition + the lease scan for mutual exclusion; note this in a comment.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/jobs/tick/route.ts .env.local.example
git commit -m "feat: add durable lecture-processing worker route"
```
(Also add `JOBS_TICK_SECRET=` to `.env.local.example` with an empty value.)

---

## Phase 7 — Presign for segments

### Task 8: Extend presign to scope a segment key

**Files:**
- Modify: `src/app/api/upload/presign/route.ts`

- [ ] **Step 1: Accept `jobId` + `segmentIndex`**

In `PresignBody`, add:
```ts
  jobId?: string;
  segmentIndex?: number;
```

- [ ] **Step 2: Build a segment-scoped key when present**

Replace the key construction block:
```ts
  const requestId = body.requestId?.trim() || crypto.randomUUID();
  const key = `${user.id}/${requestId}-${filename}`;
```
with:
```ts
  const requestId = body.requestId?.trim() || crypto.randomUUID();
  const isSegment =
    typeof body.jobId === "string" &&
    body.jobId.trim().length > 0 &&
    Number.isInteger(body.segmentIndex);
  const key = isSegment
    ? `${user.id}/${body.jobId!.trim()}/${body.segmentIndex}.${extensionForContentType(contentType)}`
    : `${user.id}/${requestId}-${filename}`;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/presign/route.ts
git commit -m "feat: support segment-scoped R2 keys in presign"
```

---

## Phase 8 — Client: segment upload helper

### Task 9: `segment-upload.ts`

**Files:**
- Create: `src/lib/segment-upload.ts`

- [ ] **Step 1: Implement**

```ts
"use client";

/**
 * Presign + PUT a single lecture segment to R2. Returns the R2 key on success.
 * Throws on any failure so the caller can keep the segment in the local draft
 * (uploaded: false) and retry later — the basis of cross-device durability.
 */
export async function uploadSegment(args: {
  blob: Blob;
  mime: string;
  jobId: string;
  segmentIndex: number;
}): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: args.mime,
      fileSize: args.blob.size,
      jobId: args.jobId,
      segmentIndex: args.segmentIndex,
    }),
  });
  if (!presignRes.ok) throw new Error("Could not presign segment upload.");
  const { presignedUrl, key } = (await presignRes.json()) as {
    presignedUrl: string;
    key: string;
  };

  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    body: args.blob,
    headers: { "Content-Type": args.mime },
  });
  if (!putRes.ok) throw new Error("Segment upload failed.");
  return key;
}

/**
 * Register an uploaded segment as a row in lecture_segments via an
 * authenticated API route (the browser cannot write the table directly).
 */
export async function registerSegment(args: {
  jobId: string;
  segmentIndex: number;
  r2Key: string;
  durationSeconds: number | null;
}): Promise<void> {
  const res = await fetch("/api/jobs/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error("Could not register segment.");
}
```

- [ ] **Step 2: Create the segment-register route `src/app/api/jobs/segment/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Body {
  jobId?: string;
  segmentIndex?: number;
  r2Key?: string;
  durationSeconds?: number | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { jobId, segmentIndex, r2Key } = body;
  if (!jobId || !Number.isInteger(segmentIndex) || !r2Key) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  // Ownership: the job must belong to the user, and the key under their folder.
  if (!r2Key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { data: job } = await supabase
    .from("lecture_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Unknown job." }, { status: 404 });

  const { error } = await supabase.from("lecture_segments").upsert(
    {
      job_id: jobId,
      index: segmentIndex,
      r2_key: r2Key,
      status: "uploaded",
      duration_seconds: body.durationSeconds ?? null,
    },
    { onConflict: "job_id,index" }
  );
  if (error) {
    return NextResponse.json({ error: "Could not register segment." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

Note: `lecture_segments` insert/upsert here runs as the **user** but RLS only granted SELECT. Add an INSERT policy scoped to the owner so this authenticated write is allowed:

- [ ] **Step 3: Add an owner INSERT policy for segments**

Append to `supabase/schema-jobs.sql` and run it in the SQL editor:
```sql
drop policy if exists "Users insert own segments" on public.lecture_segments;
create policy "Users insert own segments"
  on public.lecture_segments for insert
  with check (
    exists (
      select 1 from public.lecture_jobs j
      where j.id = lecture_segments.job_id and j.user_id = auth.uid()
    )
  );
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/segment-upload.ts src/app/api/jobs/segment/route.ts supabase/schema-jobs.sql
git commit -m "feat: client segment upload + register route + insert policy"
```

---

## Phase 9 — Client: draft per-segment storage

### Task 10: Per-segment draft model

**Files:**
- Modify: `src/lib/recording-draft.ts`

The draft currently stores fine-grained 4s chunks of one continuous recording. Extend it so each completed **segment** is recorded with its index and an `uploaded` flag, while keeping the existing chunk store for the in-progress segment's crash recovery.

- [ ] **Step 1: Add a segments store + types**

In `recording-draft.ts`, bump `DB_VERSION` to `2`, add a `SEGMENT_STORE = "segments"`, and in `onupgradeneeded` create it:
```ts
const SEGMENT_STORE = "segments";
```
Inside `onupgradeneeded` (after the chunk store block):
```ts
      if (!db.objectStoreNames.contains(SEGMENT_STORE)) {
        const segs = db.createObjectStore(SEGMENT_STORE, { keyPath: "id" });
        segs.createIndex("draftId", "draftId", { unique: false });
      }
```
Add the type:
```ts
export interface RecordingDraftSegment {
  id: string;        // `${draftId}:seg:${index}`
  draftId: string;
  index: number;
  blob: Blob;
  mime: string;
  durationSeconds: number;
  uploaded: boolean;
  createdAt: number;
}
```

- [ ] **Step 2: Add segment read/write helpers**

```ts
export async function putRecordingSegment(
  userId: string,
  segment: Omit<RecordingDraftSegment, "id" | "draftId" | "createdAt">
) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readwrite");
    tx.objectStore(SEGMENT_STORE).put({
      ...segment,
      id: `${draftId}:seg:${segment.index}`,
      draftId,
      createdAt: Date.now(),
    } satisfies RecordingDraftSegment);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function markRecordingSegmentUploaded(userId: string, index: number) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readwrite");
    const store = tx.objectStore(SEGMENT_STORE);
    const seg = (await requestToPromise(
      store.get(`${draftId}:seg:${index}`)
    )) as RecordingDraftSegment | undefined;
    if (seg) store.put({ ...seg, uploaded: true });
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function getRecordingSegments(
  userId: string
): Promise<RecordingDraftSegment[]> {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readonly");
    const segs = (await requestToPromise(
      tx.objectStore(SEGMENT_STORE).index("draftId").getAll(IDBKeyRange.only(draftId))
    )) as RecordingDraftSegment[];
    await transactionDone(tx);
    return segs.sort((a, b) => a.index - b.index);
  } finally {
    db.close();
  }
}
```

- [ ] **Step 3: Clear segments in `clearRecordingDraft`**

In `clearRecordingDraft`, include `SEGMENT_STORE` in the write transaction and delete this draft's segment rows (mirror the chunk-deletion logic using the `draftId` index).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recording-draft.ts
git commit -m "feat: per-segment recording draft storage with upload flag"
```

---

## Phase 10 — Client: rotation, auto-process, recovery

### Task 11: MediaRecorder rotation + per-segment upload

**Files:**
- Modify: `src/components/recording/recording-context.tsx`

This is the largest edit. Keep the capture pipeline (AudioContext, analyser, worklet, transcript, timer) untouched. Wrap segment lifecycle around the `MediaRecorder`.

- [ ] **Step 1: Add constants + refs**

Near the other constants:
```ts
const SEGMENT_MS = Number(process.env.NEXT_PUBLIC_ATLAS_SEGMENT_MS) || 300_000;
```
Add refs inside the provider:
```ts
const jobIdRef = useRef<string>(crypto.randomUUID());
const segmentIndexRef = useRef(0);
const segmentRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const enqueuedRef = useRef(false);
```

- [ ] **Step 2: Enqueue the job once recording starts**

In `start()`, after the recorder is created and `setPhase("recording")` (non-append path only), enqueue the job:
```ts
if (!appendToDraft && !enqueuedRef.current) {
  enqueuedRef.current = true;
  void fetch("/api/jobs/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: jobIdRef.current,
      sessionLabel,
      source: nextSource,
    }),
  }).catch(() => {});
}
```

- [ ] **Step 3: Rotate the recorder on a timer**

Add a helper that finalizes the current recorder and starts a fresh one on the same `streamRef.current`, WITHOUT tearing down the capture pipeline. Factor the `new MediaRecorder(...)` + `ondataavailable`/`onstop` wiring into a `startSegmentRecorder()` that the rotate timer and `start()` both call. On each `onstop` for a rotation (not a user Stop), build the segment blob, call `putRecordingSegment`, then `uploadSegment` + `registerSegment` + `markRecordingSegmentUploaded`, and bump `segmentIndexRef`. Schedule the next rotation with `setTimeout(rotate, SEGMENT_MS)` whenever recording.

Key rule: the **user-facing Stop** finalizes the last segment AND marks the job complete; a **rotation Stop** finalizes a segment and immediately restarts recording. Use a `rotatingRef` boolean to distinguish them in `onstop`.

```ts
const rotatingRef = useRef(false);

const finalizeSegment = useCallback(async (blob: Blob, mime: string) => {
  const index = segmentIndexRef.current;
  const durationSeconds = secondsRef.current; // best-effort; total elapsed
  await putRecordingSegment(userId, {
    index, blob, mime, durationSeconds, uploaded: false,
  });
  try {
    const r2Key = await uploadSegment({
      blob, mime, jobId: jobIdRef.current, segmentIndex: index,
    });
    await registerSegment({
      jobId: jobIdRef.current, segmentIndex: index, r2Key,
      durationSeconds,
    });
    await markRecordingSegmentUploaded(userId, index);
  } catch (err) {
    console.warn("Segment upload deferred (will retry on recovery):", err);
  }
  segmentIndexRef.current = index + 1;
}, [userId]);
```

- [ ] **Step 4: Auto-process on Stop**

Replace the recorded → "Generate notes" gate with auto-processing. In the user `stop()` path, after the final segment finalizes, mark the job complete + kick the worker:
```ts
const completeJob = useCallback(async () => {
  await fetch("/api/jobs/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: jobIdRef.current,
      sessionLabel,
      source,
      durationSeconds: Math.round(secondsRef.current) || null,
      liveTranscript: liveTranscriptRef.current || null,
    }),
  }).catch(() => {});
  await fetch("/api/jobs/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: jobIdRef.current,
      segmentCount: segmentIndexRef.current,
      durationSeconds: Math.round(secondsRef.current) || null,
      liveTranscript: liveTranscriptRef.current || null,
    }),
  }).catch(() => {});
  void fetch("/api/jobs/tick", { method: "POST" }).catch(() => {}); // best-effort kick (no secret; returns 403 but harmless — pg_cron drives it)
}, [sessionLabel, source]);
```
Then set the phase to a processing state and navigate to the processing screen (reuse the existing `stage === "analyzing"` UI / processing route). The job now lives server-side; the client no longer awaits Gemini.

Note: the best-effort `/api/jobs/tick` kick from the browser has no secret and will 403; that's fine — it exists only to *try* to start work instantly. Real triggering is pg_cron. (If you want the instant kick to actually work, add a separate authenticated `/api/jobs/kick` route that looks up the user's job and calls the worker internally with the secret. Optional for v1.)

- [ ] **Step 5: Create `/api/jobs/complete/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string; segmentCount?: number; durationSeconds?: number | null; liveTranscript?: string | null;
  };
  if (!body.jobId || !Number.isInteger(body.segmentCount)) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  const { error } = await supabase
    .from("lecture_jobs")
    .update({
      status: "recording_complete",
      segment_count: body.segmentCount,
      total_seconds: body.durationSeconds ?? null,
      live_transcript: body.liveTranscript ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.jobId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not complete job." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```
Add the matching owner UPDATE policy for `lecture_jobs` (segment_count/status) in `schema-jobs.sql`:
```sql
drop policy if exists "Users update own jobs" on public.lecture_jobs;
create policy "Users update own jobs"
  on public.lecture_jobs for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users insert own jobs" on public.lecture_jobs;
create policy "Users insert own jobs"
  on public.lecture_jobs for insert
  with check (auth.uid() = user_id);
```
Run the updated `schema-jobs.sql` in the SQL editor.

- [ ] **Step 6: Recovery reconciliation**

In the existing draft-restore effect, after restoring, call `getRecordingSegments(userId)` and re-upload any `uploaded: false` segment via `uploadSegment` + `registerSegment` + `markRecordingSegmentUploaded`. If the draft indicates the session had been stopped, also call `/api/jobs/complete` so the worker can finish. This is what makes a recording interrupted mid-upload recoverable, now across devices for everything already in R2.

- [ ] **Step 7: Reset `jobIdRef`/`segmentIndexRef`/`enqueuedRef` in `discard()` and after a successful completion**, mirroring the existing `requestIdRef` resets.

- [ ] **Step 8: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/recording/recording-context.tsx`
Expected: PASS.

- [ ] **Step 9: Manual verification (critical — C1/C3)**

Run `npm run dev`. Record a 30s mic lecture with `NEXT_PUBLIC_ATLAS_SEGMENT_MS=10000` (10s) set locally to force rotation. Verify:
- Timer, waveform, live transcript run continuously with no visible reset at the 10s/20s boundaries (C1).
- `lecture_segments` rows appear (index 0, 1, 2…) during recording, each `uploaded` then `transcribed`.
- Mid-recording, kill the network (DevTools offline) for a segment, then restore — that segment stays in the draft and uploads on reconnect/recovery (C3).
- After Stop, the dashboard shows "Processing" and flips to "Ready" with coherent, ordered notes (set the env back to 300000 and record a longer real lecture to sanity-check quality vs. a pre-change note — C2).

- [ ] **Step 10: Commit**

```bash
git add src/components/recording/recording-context.tsx src/app/api/jobs/complete/route.ts supabase/schema-jobs.sql
git commit -m "feat: segmented recording, auto-process on stop, cross-device recovery"
```

---

## Phase 11 — Dashboard live-update

### Task 12: Realtime subscription

**Files:**
- Create: `src/components/dashboard/realtime-refresh.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create the client island**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes the dashboard when any of the user's notes change (e.g. a
 * background job flips a note from processing -> ready). Falls back to a poll
 * while a processing note is present, in case Realtime isn't connected.
 */
export function RealtimeRefresh({ userId, hasProcessing }: { userId: string; hasProcessing: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [hasProcessing, router]);

  return null;
}
```

- [ ] **Step 2: Mount it in the dashboard**

In `dashboard/page.tsx`, after computing `notes`, add:
```tsx
const hasProcessing = notes.some((n) => displayStatus(n) === "processing");
```
and render near the top of the returned `<main>`:
```tsx
<RealtimeRefresh userId={user.id} hasProcessing={hasProcessing} />
```
Import it. (Server component rendering a client island is fine.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification**

With a job processing, open `/dashboard` on a second browser/device signed in as the same user. When the worker finishes, the card flips to "Ready" without a manual reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/realtime-refresh.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: live dashboard updates via Supabase Realtime"
```

---

## Phase 12 — "Safe to close" reassurance

### Task 13: 25s processing toast

**Files:**
- Modify: the processing-screen component (the recorder UI that shows `stage === "analyzing"`, e.g. `src/app/(app)/upload/page.tsx` or the recorder card). Locate where the processing/analyzing state is rendered.

- [ ] **Step 1: Add a delayed reassurance toast**

Where the processing state begins, add an effect:
```tsx
useEffect(() => {
  if (stage !== "analyzing") return;
  const id = setTimeout(() => {
    toast.message(
      "Longer lectures take a few minutes. It's safe to close this tab — Atlas keeps working and your notes will appear in your dashboard on any device.",
      { duration: 8000 }
    );
  }, 25_000);
  return () => clearTimeout(id);
}, [stage]);
```
(Use the existing `sonner` `toast` already imported in the recording UI.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: 'safe to close' reassurance after 25s of processing"
```

---

## Phase 13 — Back-compat + cutover

### Task 14: Repoint `POST /api/notes` and the file-upload path

**Files:**
- Modify: `src/app/api/notes/route.ts`
- Modify: `src/lib/upload-lecture.ts` (file-upload path)
- Modify: `src/components/recording/recording-context.tsx` (remove the old `generate()` synchronous flow if fully replaced)

- [ ] **Step 1: Decide the file-upload (drag-drop) flow**

For an uploaded file, the browser still PUTs to R2 (existing presign), then calls `enqueue` with a fresh `jobId` and registers a **single** segment pointing at the uploaded key (status `uploaded`), then calls `complete` with `segmentCount: 1`. Update `uploadLectureAndGenerate` to: presign → PUT → `enqueue` → `registerSegment(index 0, that key)` → `complete(segmentCount: 1)` and return the `noteId`. The worker handles it identically.

For files >20 MB (a single big segment), the worker's `transcribeSegment` inline path will exceed limits. Add a size guard in the worker: if a segment's audio is >18 MB, fall back to `generateNotesFromAudio` (Files API) for that single segment and store the result as the segment's `partial_notes`/`transcript`. (This preserves large-file uploads.)

- [ ] **Step 2: Turn `POST /api/notes` into a thin shim or remove it**

If nothing still calls `/api/notes`, delete the route. If older clients might, make it return `410 Gone` with a message pointing at the new flow, or internally forward to `enqueue`. Verify no remaining callers:
```bash
grep -rn "/api/notes\"" src | grep -i post
```

- [ ] **Step 3: Remove the client 300s race**

In `recording-context.tsx`, delete `PROCESSING_TIMEOUT_MS` and the `Promise.race` timeout in `generate()` — processing is no longer awaited by the browser, so there is nothing to time out. The recorder transitions to the processing screen and trusts the server + Realtime.

- [ ] **Step 4: Typecheck + lint + full test run**

Run: `npx tsc --noEmit && npx eslint . && npm test && npm run build`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: route file-upload + legacy generate through durable jobs"
```

---

## Phase 14 — Cron safety net (manual apply)

### Task 15: pg_cron + pg_net schedule

**Files:**
- Create: `supabase/cron-worker.sql`

- [ ] **Step 1: Write the SQL (with placeholders to fill at apply time)**

```sql
-- One-time: enable the extensions (free tier).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Minute-ly safety net that pokes the worker. The worker self-chains while a
-- job has work, so this mostly restarts stalled chains and starts jobs whose
-- Stop-time kick never landed. Idempotent: a tick with no work is a no-op.
select cron.schedule(
  'atlas-lecture-worker',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://YOUR-APP.vercel.app/api/jobs/tick',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-jobs-secret','YOUR_SHARED_SECRET'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To change/remove later:
--   select cron.unschedule('atlas-lecture-worker');
```

- [ ] **Step 2: Apply it**

1. Set `JOBS_TICK_SECRET` in **Vercel → Project → Settings → Environment Variables** (same value you'll paste below) and redeploy.
2. In the Supabase **SQL Editor**, run the extension lines (or enable via **Database → Extensions**).
3. Edit the `cron.schedule` block: replace `YOUR-APP.vercel.app` with your deployed domain and `YOUR_SHARED_SECRET` with your `JOBS_TICK_SECRET`, then run it.
4. Verify: `select * from cron.job;` shows `atlas-lecture-worker`.

- [ ] **Step 3: End-to-end verification on the deployed app**

Record a real lecture, hit Stop, **close the tab**, and open `/dashboard` on your phone. Within a few minutes the "Processing" card becomes the finished note. Check `cron.job_run_details` if it stalls.

- [ ] **Step 4: Commit**

```bash
git add supabase/cron-worker.sql
git commit -m "feat: pg_cron worker safety-net migration"
```

---

## Self-review notes (addressed)

- **Spec §1 (segmentation, C1):** Tasks 11 (rotation on same stream). **§1 (per-segment upload, C3):** Tasks 9–11. **§2 (data model):** Task 5 + policy additions in 9/11. **§3 (worker):** Tasks 4, 7. **§3 (compose quality, C2):** Tasks 3, 4 + manual check 11.9. **§4 (recovery):** Tasks 10, 11.6. **§5 (Realtime):** Task 12. **§6 (safe-to-close):** Task 13. **§7 (back-compat / file upload / large files):** Task 14. **§ cron (C4):** Task 15. **Free-tier 60s (C4):** `maxDuration=60` + `JOBS_SLICE_BUDGET_MS` yield + self-chain in Task 7.
- **Open implementation risks flagged inline:** Supabase `.or()` optimistic-lock syntax (Task 7 Step 3), `@google/genai` inlineData part shape (Task 4 Step 4), and the unauthenticated instant-kick 403 (Task 11 Step 4) — each has a stated fallback.
- **No TDD for browser/external-IO files** by design (no meaningful unit under test); those use typecheck + lint + explicit manual verification. Pure logic (Tasks 2, 3) is TDD.
