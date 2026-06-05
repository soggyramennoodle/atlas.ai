# Durable, Cross-Device Lecture Processing — Design

**Date:** 2026-06-05
**Status:** Approved for planning
**Author:** Atlas (with Adeeb)

## Problem

Today a lecture is recorded in the browser, the audio blob is uploaded to R2 by
the browser, and then `POST /api/notes` runs Gemini **synchronously inside the
request the browser is awaiting**. Three consequences:

1. **Not fire-and-forget.** Close the tab mid-generation and the serverless
   function can be killed on disconnect; the job orphans and is swept to
   "failed" after 6 minutes.
2. **Hard time cap.** On Vercel **Hobby** every function invocation is capped at
   **60 seconds**. A 60-minute lecture's Files-API wait + `generateContent` call
   ("several minutes") cannot complete in one invocation. (`maxDuration = 300`
   in the code is silently ineffective on Hobby.)
3. **Browser-coupled upload.** The audio lives on the device until the browser
   uploads it. Close the tab before/just-after Stop and nothing reaches the
   server to process.

### Goal

Record a lecture on one device, close the tab / laptop, and later open Atlas on
**any** device (including one that never saw the recording) and find the
finished notes in the dashboard. Processing must continue entirely server-side.

### Hard constraints (must not regress)

- **C1 — Identical recording UX.** The act of recording (timer, live waveform,
  live transcript, pause/resume, silence detection) must feel exactly as it does
  today. Segmentation must be invisible to the user.
- **C2 — Identical note quality.** Notes must remain audio-grounded and at least
  as thorough as today. No quality loss from segmentation.
- **C3 — Recovery preserved.** Mid-recording crash/connection-loss recovery via
  the IndexedDB draft must keep working. A recording interrupted by a network
  error or accidental tab close must still be recoverable.
- **C4 — Free tier.** No Vercel Pro, no paid external job runner. Vercel Hobby
  (60s/invocation; cron only once/day) + Supabase free (incl. `pg_cron`,
  Realtime) + Cloudflare R2 + Gemini API.

## Architecture overview

```
Recording (browser)                 Server (durable)                 Any device
──────────────────                  ────────────────                 ──────────
MediaRecorder rotates    ── R2 ──>  lecture_jobs / lecture_segments   Dashboard
every ~5 min into                   (Supabase, service-role)          subscribes
independent WebM segments            │                                via Realtime
   │ each segment:                   ▼                                   │
   │  • appended to IndexedDB draft  /api/jobs/tick  (≤60s slices)       │
   │  • uploaded to R2               • transcribe next segment (Gemini)  │
   ▼                                 • self-chains while work remains    ▼
Stop → job=recording_complete        • compose final notes when done   "Processing"
   → kick worker (best-effort)       Supabase pg_cron (1/min) = safety   flips to
                                     net for stalled chains              "Ready"
```

The request the browser makes only **enqueues**. All Gemini work happens in the
worker, which advances a persisted state machine in bounded slices.

## 1. Segmented recording (satisfies C1, C3)

### Rotation, not re-architecture

Keep a **single continuous capture pipeline** — one `AudioContext`, one analyser,
one energy worklet, one `SpeechRecognition`, one timer — exactly as
`recording-context.tsx` has today. Only the `MediaRecorder` rotates:

- Every `SEGMENT_MS` (default **5 min = 300_000 ms**) of *recording* time, call
  `rec.stop()` and immediately `new MediaRecorder(sameStream).start()`.
- Each `rec.onstop` produces a complete, independently-decodable WebM blob — one
  **segment**.
- The rotation boundary is a few-ms audio gap, imperceptible for a lecture. The
  stream, waveform, transcript, timer, and silence metrics never reset — they
  belong to the capture pipeline, not the `MediaRecorder`, so the user sees one
  continuous session (C1).
- Pause/resume: rotation timer pauses with the recorder. On resume it continues.
  A pause does **not** force a segment boundary unless `SEGMENT_MS` elapsed.

Within a segment, the recorder still uses `timeslice` (current
`RECORDING_DRAFT_SLICE_MS = 4000`) so partial segment bytes are flushed to the
IndexedDB draft continuously — preserving fine-grained crash recovery (C3).

### Per-segment side effects

When a segment completes (`onstop`):

1. **Persist locally** — store the finished segment blob in the IndexedDB draft,
   tagged with its segment index and an `uploaded: false` flag (see §4).
2. **Upload to R2** — `PUT` to `userId/<jobId>/<index>.webm` via a presigned URL
   (reuse `/api/upload/presign`, extended to accept a `jobId` + `segmentIndex`
   and return the segment key). On success, mark the draft segment
   `uploaded: true` and insert/confirm the `lecture_segments` row.

Uploads happen **during** the lecture, so by Stop most bytes are already in R2.

### Stop

On Stop: flush + upload the final segment, set `lecture_jobs.status =
recording_complete` and `segment_count`, then fire one best-effort
`POST /api/jobs/tick` to start processing immediately. **Processing does not
depend on this fetch** — pg_cron will pick the job up within a minute regardless.

### Segment length

`SEGMENT_MS = 300_000` (5 min). Rationale: a 5-min Opus/WebM segment is ~2–5 MB
— under Gemini's 20 MB inline limit, so segments skip the Files-API
`PROCESSING` wait entirely; each transcription call runs in well under 60s; and a
60-min lecture is only ~12 segments, keeping the compose step cheap. Configurable
via env (`ATLAS_SEGMENT_MS`) without code changes.

## 2. Data model (Supabase)

### `lecture_jobs`

| column          | type        | notes |
|-----------------|-------------|-------|
| `id`            | uuid pk     | the `jobId`; also the R2 folder + idempotency key |
| `user_id`       | uuid        | RLS-scoped to owner |
| `note_id`       | uuid        | FK to the placeholder `notes` row |
| `status`        | text        | `recording \| recording_complete \| processing \| ready \| failed` |
| `segment_count` | int         | known once `recording_complete` |
| `total_seconds` | int         | |
| `source`        | text        | `microphone \| device` |
| `session_label` | text        | |
| `live_transcript` | text      | best-effort fallback only |
| `attempts`      | int         | worker retry counter |
| `heartbeat_at`  | timestamptz | lease for the active worker tick |
| `error`         | text        | last failure reason |
| `created_at`/`updated_at` | timestamptz | |

### `lecture_segments`

| column        | type    | notes |
|---------------|---------|-------|
| `job_id`      | uuid    | FK |
| `index`       | int     | 0-based; `(job_id, index)` unique |
| `r2_key`      | text    | `userId/<jobId>/<index>.webm` |
| `status`      | text    | `uploaded \| transcribing \| transcribed \| failed` |
| `duration_seconds` | int | |
| `transcript_text` | text | per-segment transcript from Gemini |
| `partial_notes`   | jsonb | per-segment audio-grounded structured notes |
| `attempts`    | int     | |
| `created_at`/`updated_at` | timestamptz | |

### `notes`

Unchanged shape. The placeholder is created at recording start with
`content.status = "processing"`, so the dashboard surfaces the in-progress
lecture on **any** device immediately. The job's `note_id` points at it.

RLS: users can read their own `lecture_jobs`/`lecture_segments`. **Writes during
processing are performed by the worker using the service-role key**, which
bypasses RLS; the browser never writes these tables directly except the initial
job/placeholder creation (done through an authenticated API route).

## 3. The worker — `/api/jobs/tick` (satisfies the durability goal, C2, C4)

A new route. `runtime = "nodejs"`. Authenticated by a shared secret
(`JOBS_TICK_SECRET`) in a header — **not** a user session. Uses the
service-role Supabase client.

### One tick

1. **Claim work.** Atomically select one job whose `status IN
   (recording_complete, processing)` and whose `heartbeat_at` is null/stale
   (older than `LEASE_MS`, default 90s). Set `status = processing`, bump
   `heartbeat_at = now()`. The conditional update is the lock — two concurrent
   ticks cannot both claim the same job.
2. **Transcribe loop.** While elapsed < `SLICE_BUDGET_MS` (default 45_000) and an
   `uploaded` segment remains:
   - Mark the segment `transcribing`, refresh `heartbeat_at`.
   - Download its audio from R2; send **inline** to Gemini with a per-segment
     prompt that returns BOTH the verbatim transcript AND audio-grounded
     structured partial notes for that window (same schema/system prompt family
     as `gemini.ts`, scoped to "this is one ~5-minute slice of a longer
     lecture").
   - Save `transcript_text` + `partial_notes`, set segment `transcribed`,
     **delete the R2 segment audio** (retention guarantee, now per-segment).
3. **Compose.** When `status = recording_complete`-derived work is done — i.e.
   `segment_count` known and every segment `transcribed` — run **one** Gemini
   text call that reconciles the ordered `partial_notes` into the final
   `StructuredNotes`: a single coherent title/subject/summary, merged & ordered
   sections, de-duplicated `keyConcepts`, and the stitched full transcript. Write
   it to the `notes` row (`content = notes`, `status = "ready"`), set the job
   `ready`. Fall back to `live_transcript` only if the model transcript is empty
   (parity with today).
4. **Chain or yield.** If work remains (more segments, or segments still
   uploading and not yet `recording_complete`), fire a fire-and-forget
   `POST /api/jobs/tick` so processing continues immediately rather than waiting
   for the next cron minute. Then return.

### Why quality is preserved (C2)

Gemini still **hears every minute of audio** — each segment is transcribed and
noted from its real audio, capturing tone, "remember this for the exam" cues,
spoken math, etc. The compose pass only reconciles already-audio-grounded notes
into one document; it never invents content. The per-segment prompt is told it
is mid-lecture so it does not emit per-segment titles/summaries or the
insufficient-content rejection (that judgment is made once, at compose, over the
whole lecture). Net: equal or better thoroughness than one monolithic call.

### Scheduling

- **Primary:** self-chaining ticks (above) drive a job to completion in ~minutes.
- **Safety net:** Supabase `pg_cron` runs every minute, calling `/api/jobs/tick`
  via `pg_net` with the shared secret. This restarts any chain that died
  mid-flight (detected by a stale `heartbeat_at`) and starts jobs whose Stop-time
  kick never landed. Idempotent: a tick with nothing to claim is a cheap no-op.

### Failure handling

- Per-segment transcription retries up to `MAX_SEGMENT_ATTEMPTS` (default 3). A
  segment that still fails is marked `failed`; compose proceeds over the
  remaining segments and flags the gap in the summary rather than failing the
  whole lecture.
- A job exceeding `MAX_JOB_ATTEMPTS` or a hard error sets `notes.status =
  "failed"` with a clear message, mirroring today's failure UX. The existing
  client "download recording / try again" escape hatch remains for the local
  draft.
- `heartbeat_at` lease prevents double-processing and double Gemini billing.
- A job that never reaches `recording_complete` (recorder vanished mid-lecture)
  is reclaimed: if no heartbeat and no new segments for `ABANDON_MS`, the worker
  composes from whatever segments are `transcribed` (partial notes) rather than
  discarding the lecture.

## 4. Recovery (satisfies C3)

The IndexedDB draft remains the source of truth for un-uploaded bytes. Changes:

- The draft records, per segment: the segment blob, its index, and
  `uploaded: boolean`. Sub-segment `timeslice` chunks of the *in-progress*
  segment are still flushed continuously (unchanged fine-grained recovery).
- **On reopening the same device**, draft restore (existing
  `getRecordingDraft`) runs as today, plus a reconciliation step:
  1. If a `lecture_jobs` row exists for this draft's `jobId`, any segment already
     `uploaded`/present server-side is skipped.
  2. Any segment in the draft with `uploaded: false` (e.g. the network dropped
     mid-upload, or the tab closed before the final segment uploaded) is
     re-uploaded to R2 now, and its `lecture_segments` row inserted.
  3. If the recording was still in progress (no Stop), the user can **resume**
     (existing `resumeDraft`) — a new segment is appended; the job stays open.
     If it had been stopped, reconciliation finishes the upload and the job is
     marked `recording_complete` so the worker can finish it.
- **Connection loss mid-recording** does not interrupt capture (MediaRecorder
  keeps writing to the local draft); only uploads pause. Uploads retry with
  backoff and resume when the network returns. No audio is lost — it is in the
  draft until confirmed in R2.

This means recovery is strictly stronger than today: previously only the whole
blob on the same device was recoverable; now each segment is independently
durable the moment it reaches R2, across devices.

## 5. Dashboard live-update (cross-device)

- The dashboard (and the processing screen) subscribe to **Supabase Realtime**
  on the user's `notes` rows (filtered by `user_id`). When the worker flips a
  note to `ready`/`failed`, the card updates live — on whatever device is open,
  no manual reload.
- Fallback: if the Realtime socket isn't connected, poll the affected note(s)
  every ~10s while any `processing` note is visible.
- The dashboard is otherwise unchanged; it already renders
  `processing/ready/failed` states.

## 6. "Safe to close" reassurance

On the processing screen, if elapsed processing time exceeds **25s**, show a
non-blocking toast/popout:

> "Longer lectures take a few minutes to process. It's safe to close this tab —
> Atlas keeps working and your notes will appear in your dashboard on any
> device."

By this point the job is fully server-side (segments uploaded, worker running),
so the statement is true. Dismissable; shown once per session.

## 7. Backward compatibility

- **File upload path** (`/upload` drag-drop): a single uploaded file becomes a
  one-segment job and flows through the identical worker pipeline. For files >20
  MB the worker falls back to the **Files API** path (current `gemini.ts` upload
  + ACTIVE-wait) for that single segment, spread across ticks via `heartbeat_at`
  if the wait is long.
- **Short recordings** (< one segment) are one-segment jobs — same pipeline, same
  result, no special-casing.
- The legacy synchronous `POST /api/notes` is replaced by an **enqueue-only**
  endpoint that creates the job + placeholder note and returns `202` immediately;
  the client no longer races a 300s timeout. Old in-flight clips recovered from a
  draft re-enter via the enqueue path.

## 8. Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `recording-context.tsx` (edit) | Rotate MediaRecorder, emit segments, drive uploads, keep UX identical | recording-draft, presign, jobs API |
| `recording-draft.ts` (edit) | Per-segment local persistence + `uploaded` flag | IndexedDB |
| `lib/segment-upload.ts` (new) | Presign + PUT one segment to R2, mark draft/segment row | presign route |
| `api/jobs/enqueue` (new, replaces notes POST) | Create job + placeholder note; return 202 | supabase |
| `api/jobs/tick` (new) | Worker: claim → transcribe segments → compose; chain; service-role | gemini, r2, supabase admin |
| `lib/gemini.ts` (edit) | Add `transcribeSegment()` (audio→transcript+partial notes) and `composeNotes()` (partials→StructuredNotes) | @google/genai |
| `lib/jobs.ts` (new) | Job/segment state-machine helpers, lease logic | supabase admin |
| Dashboard / processing screen (edit) | Realtime subscription + "safe to close" toast | supabase realtime |
| `supabase/schema-*.sql` + pg_cron migration (new) | Tables, RLS, cron + pg_net trigger | — |

## 9. Config / env

- `ATLAS_SEGMENT_MS` (default 300000)
- `JOBS_TICK_SECRET` (shared secret for the worker route + pg_cron)
- `JOBS_LEASE_MS` (default 90000), `JOBS_SLICE_BUDGET_MS` (default 45000)
- `MAX_SEGMENT_ATTEMPTS` (3), `MAX_JOB_ATTEMPTS` (5)
- Existing: `GEMINI_API_KEY`, `GEMINI_MODEL`, R2 vars, `SUPABASE_SERVICE_ROLE_KEY`

## 10. Out of scope (v1)

- Resumable/multipart upload of a *single* segment across devices mid-upload
  (segments are small; a failed segment upload simply retries from the local
  draft on the same device).
- Real-time partial-notes streaming to the UI (notes appear when the job is
  `ready`; the dashboard shows `processing` until then).
- Server-side ffmpeg slicing (avoided by client-side segmentation).

## 11. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Rotation introduces an audible gap | ~ms boundary on the same stream; acceptable for speech. Validate with a real recording before merge. |
| Compose loses cross-segment coherence | Per-segment notes carry `source_excerpt`s and order; compose prompt reconciles overlaps and renumbers sections. Compare output vs current monolithic notes on a sample lecture. |
| pg_cron / pg_net not enabled on the project | Migration enables both; documented setup step. Worker still runs via the Stop-time kick + self-chaining even if cron is delayed. |
| Double processing / double billing | `heartbeat_at` conditional-update lease + per-segment `status` guards. |
| Hobby 60s cap hit by a slow segment | 5-min inline segments transcribe well under 60s; `SLICE_BUDGET_MS` yields before the cap; next tick resumes. |
