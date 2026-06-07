# Gemini spend-cap resilience + admin jobs hardening

**Date:** 2026-06-06
**Status:** Approved design, pending implementation plan

## Problem

Atlas runs note generation through the Gemini API behind a monthly billing
spend cap. When that cap is hit, Gemini returns:

```json
{ "error": { "code": 429, "message": "...exceeded its monthly spending cap", "status": "RESOURCE_EXHAUSTED" } }
```

Today the durable worker (`src/app/api/jobs/tick/route.ts`) catches every Gemini
error generically: a segment is retried up to `MAX_SEGMENT_ATTEMPTS` (3) times,
then marked `failed`, and the job ends with a generic "couldn't transcribe"
message. So a spend-cap outage would:

- silently burn retry attempts on an error that cannot succeed until the cap is
  raised,
- keep hammering Gemini across every queued job,
- surface to users as an ordinary failure (lost work / forced re-record),
- give the operator no signal that the cap was the cause.

We also want operability improvements on the admin jobs page that share the same
plumbing: visible/copyable IDs, a live "running vs stuck" indicator, and a
per-job requeue button.

## Goals

1. Detect the spend-cap error distinctly from ordinary 429 rate limits.
2. The instant a cap is detected, stop calling Gemini and **hold** affected
   jobs in place (segments preserved) instead of failing them.
3. Email the operator **once per incident**.
4. Show the user an honest, calm processing-screen state — not a scary failure.
5. Give the operator an admin "Mark restored" button that is the single source
   of truth: clickable/green while an incident is open, greyed/disabled with a
   tooltip when healthy.
6. On restore, **auto-resume** held jobs from saved segments and email each
   affected user once that processing is back online.
7. Harden the admin jobs page: visible+copyable IDs, heartbeat/stuck indicator,
   per-job requeue button. Don't let cleanup purge held jobs.

## Non-goals

- Automatic health-probe polling of Gemini (explicitly deferred — the restore
  button is the source of truth).
- A new `LectureJobStatus` enum value. "Held" is derived state, not a status.
- Handling ordinary rate limits differently than today (they remain transient
  retries).

## Design

### 1. Error classification — `src/lib/gemini.ts`

Add a typed error and a classifier:

```ts
export class GeminiSpendCapError extends Error {
  constructor(message: string) { super(message); this.name = "GeminiSpendCapError"; }
}

export type GeminiErrorKind = "spend_cap" | "rate_limit" | "other";

export function classifyGeminiError(err: unknown): GeminiErrorKind;
```

Classification rules (best-effort over the SDK error shape — read `code`,
`status`, and `message`/nested `error`):

- `spend_cap` ⇐ `status === "RESOURCE_EXHAUSTED"` **and**
  `/spend|billing|quota|cap/i` matches the message.
- `rate_limit` ⇐ otherwise `code === 429` or `status === "RESOURCE_EXHAUSTED"`.
- `other` ⇐ everything else.

`transcribeSegment`, `composeNotes`, and `generateNotesFromAudio` wrap their
`generateContent`/`files` calls; on catch, if `classifyGeminiError(err) ===
"spend_cap"`, re-throw `new GeminiSpendCapError(...)`. All other errors propagate
unchanged so existing retry behavior is preserved.

### 2. Incident store — `system_alerts`

New idempotent SQL file `supabase/schema-alerts.sql`:

```sql
create table if not exists public.system_alerts (
  id                uuid primary key default gen_random_uuid(),
  type              text not null,              -- 'GEMINI_SPEND_CAP'
  active            boolean not null default true,
  first_detected_at timestamptz not null default now(),
  last_detected_at  timestamptz not null default now(),
  notification_sent boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
-- At most one active alert per type.
create unique index if not exists system_alerts_active_type_idx
  on public.system_alerts (type) where active;
```

RLS: enable, no public policies — all access is via the service-role client
(worker + admin endpoints). No browser reads.

Helpers in new `src/lib/alerts.ts` (`server-only`), using `createAdminClient()`:

- `getActiveAlert(type): Promise<SystemAlert | null>`
- `openAlert(type): Promise<{ alert, created }>` — insert; on unique-violation
  (race), fetch+`touchAlert` instead. `created` distinguishes first-open.
- `touchAlert(id)` — bump `last_detected_at`.
- `markNotified(id)` — set `notification_sent = true`.
- `resolveAlert(type)` — set `active = false, resolved_at = now()`.

Add `SystemAlert` + `SystemAlertType` to `src/lib/types.ts`.

### 3. Worker — `src/app/api/jobs/tick/route.ts`

**Short-circuit at the top of `runWorker`** (after auth): if
`getActiveAlert("GEMINI_SPEND_CAP")` is active, return
`NextResponse.json({ paused: true })` without claiming any job. This is what
stops Gemini from being hammered during an outage.

**Catch `GeminiSpendCapError`** specifically around `transcribeSegment` (segment
loop) and `composeNotes` (compose block), *before* the generic `catch`:

- Open/refresh the incident: `const { alert, created } = await openAlert("GEMINI_SPEND_CAP")`.
  - If `created` (or `!alert.notification_sent`): send the admin email (§5),
    then `markNotified(alert.id)`. Wrapped so an email failure never throws.
  - Else `touchAlert(alert.id)`.
- Tag and hold the job:
  - `lecture_jobs`: `error = 'gemini_spend_cap'`, `heartbeat_at = null`,
    `updated_at = now()`. **Status unchanged**, **attempts not incremented**.
  - If it was a segment error: reset that segment `transcribing → uploaded`
    **without** incrementing its `attempts`.
- Return `NextResponse.json({ claimed: true, held: "spend_cap" })`.

"Held" is therefore derived: an open job (`recording_complete`/`processing`)
whose `error === 'gemini_spend_cap'` while a `GEMINI_SPEND_CAP` alert is active.
The short-circuit guarantees held jobs aren't reclaimed until resolve.

### 4. Admin resolve + status endpoints

`GET /api/admin/gemini/status` (gated by `getNewsroomAdmin`) →
`{ active: boolean, since: string | null, affectedJobs: number, affectedUsers: number }`.
Counts jobs with `error = 'gemini_spend_cap'` and `status != 'ready'`.

`POST /api/admin/gemini/resolve` (gated by `getNewsroomAdmin`):

1. `resolveAlert("GEMINI_SPEND_CAP")`.
2. Select held jobs (`error = 'gemini_spend_cap'`, `status != 'ready'`); collect
   distinct `user_id`s before clearing.
3. Clear the tag: `error = null, updated_at = now()` → they become reclaimable
   and auto-resume from their saved segments on the next tick.
4. For each distinct affected user, look up their email
   (`auth.users` via admin client) and send the "back online" email (§5), once.
   Failures logged, never fatal.
5. Best-effort `selfChain`/kick a tick so resume starts immediately.
6. Return `{ resolved: true, requeued: <jobCount>, notified: <userCount> }`.

Idempotent: resolving with no active alert is a no-op success.

### 5. Email — Loops (already wired, `src/lib/loops.ts`)

Two new transactional templates created in Loops, referenced by env:

- `LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID` — admin alert. Sent to each address
  in `NEWSROOM_ADMIN_EMAILS`, **once per incident** (guarded by
  `notification_sent`). Idempotency key includes the alert id.
- `LOOPS_BACK_ONLINE_TRANSACTIONAL_ID` — user "back online". Sent per affected
  user on resolve. Idempotency key includes alert id + user id.

Thin helpers (`sendSpendCapAdminAlert`, `sendBackOnlineEmail`) in `alerts.ts` or
a small `src/lib/admin-notify.ts`, both delegating to `sendLoopsEmail`. If a
template env var is missing, log and skip (don't crash the worker/resolve).

### 6. Admin jobs UI — `/admin/jobs`

**Restore button** — new client component at the top of the page, fed by
`GET /api/admin/gemini/status` (initial server fetch + refetch after action):

- Active incident → enabled, green/destructive-positive styling:
  "Gemini at capacity — N jobs held · Mark restored". Confirm dialog before
  firing; on success show "Restored — N jobs requeued, M users notified".
- Healthy → disabled/greyed, hover tooltip: "Gemini API is processing
  normally." (use existing tooltip primitive).

**Per-row heartbeat / stuck indicator** — derived from `heartbeat_at` age vs
`JOBS_LEASE_MS`:

- `Held` (amber/red dot) when `error === 'gemini_spend_cap'` + active incident.
- `Running` (green) when `processing` and heartbeat fresh (`!isLeaseStale`).
- `Stuck` (rose) when open (`recording_complete`/`processing`) and heartbeat
  stale.
- otherwise idle (no dot). `AdminJobRow` gains the needed fields; computed
  server-side in `page.tsx` and/or a small helper in `jobs-retention`/`jobs`.

**IDs visible + copyable** — keep the short `formatAdminId` display but make
`job`, `note`, and `user` IDs click-to-copy the full value (small copy
affordance / `title` already holds the full id). Render `note —` only when
`noteId` is genuinely null. This is a client interaction, so the row (or an
`IdChip`) becomes a small client component.

**Per-job Requeue button** — shown on `failed` and `Stuck` rows →
`POST /api/admin/jobs/[id]/requeue` (gated by `getNewsroomAdmin`):

- Reset that job's `failed` segments to `uploaded`, `attempts = 0`.
- Job: `status = 'recording_complete'`, `error = null`, `heartbeat_at = null`,
  `updated_at = now()`.
- If the job had previously `failed` (its note was overwritten with the
  "Processing failed" content), reset the note back to a processing placeholder
  so the user sees it processing again rather than a stale failure.
- Kick a tick. Return `{ requeued: true }`.

Spend-cap-held jobs auto-resume on resolve and don't need this button; it exists
for ordinary `failed`/`Stuck` jobs.

### 7. Cleanup exemption

In the stale-job cleanup path (`src/app/api/jobs/cleanup` /
`src/lib/jobs-retention`): exclude jobs with `error = 'gemini_spend_cap'` from
**stale** deletion while a `GEMINI_SPEND_CAP` alert is active, so a multi-hour
cap doesn't purge held work. Terminal-retention cleanup of `ready`/`failed` jobs
is unaffected.

### 8. User-facing processing screen — `src/components/upload/processing-overlay.tsx`

Keep the existing processing-screen UI; add a new capacity variant. The user
still lands on the "Saving / Atlas is writing your notes" overlay after pressing
**Done** (live) or **Generate notes** (upload). When the watcher learns the job
is cap-held, the overlay flips to a calm capacity state — distinct from the
existing `failed` (retry/download/discard) state because the recording is saved
and will auto-resume.

- Extend `ProcessingIssue["kind"]` with `"capacity"`.
- **Glow turns red:** the capacity state uses a red radial bloom (not the
  multicolor `AiGlow`), tuned to be clearly visible on **both** light and dark
  without being too dark or too light — target ~`rose-500` at ~30–40% opacity
  (a mid red), not the very dark `destructive/20` used for hard failures.
  Verify against both themes.
- **Copy:** title + message as planned, e.g. title "Atlas is at capacity right
  now", message "Your recording is saved. Atlas AI is temporarily unable to
  process new recordings, and yours will finish automatically once processing is
  restored — you'll get an email when it's done."
- **Back to dashboard button** (reuse the existing `/dashboard` link styling).
- **Reassurance box** styled like the amber "Keep this tab open" box, but
  inverted in meaning: "You can safely close this tab — we'll finish your notes
  and email you when they're ready." (calm/neutral or green tone, not amber
  warning).
- The capacity state shows **no** retry/download/discard buttons (the work is
  safe and queued).

**How the browser learns of the hold:** the existing status watcher (the one
that redirects to the note on completion — see `recording-context.tsx` /
`uploader.tsx`) gains a branch: when the user's own job row shows
`error === 'gemini_spend_cap'` (readable under existing RLS), emit a
`{ kind: "capacity", ... }` `ProcessingIssue`. No new browser permissions
needed.

## Data flow

```
record/upload → segments in R2 → worker tick
   worker: active GEMINI_SPEND_CAP alert? ──yes──▶ return {paused}
   worker calls Gemini ──spend_cap──▶ GeminiSpendCapError
       openAlert (once: email admin) · tag job error=gemini_spend_cap · clear heartbeat · segment→uploaded
   browser watcher sees job.error=gemini_spend_cap ──▶ ProcessingOverlay capacity state (red glow)
   ── operator raises cap, clicks "Mark restored" ──
   resolve: alert.active=false · clear job.error · email affected users · kick tick
   worker reclaims jobs ──▶ resume from saved segments ──▶ notes ready
```

## Testing

Unit (vitest):

- `classifyGeminiError`: spend-cap message → `spend_cap`; bare 429 → `rate_limit`;
  unrelated error → `other`; tolerant of nested SDK error shapes.
- `alerts.ts`: `openAlert` idempotency under the unique-active index (race →
  touch, not duplicate); `resolveAlert` no-op when none active; `markNotified`.
- Resolve "affected users" dedupe (multiple jobs, same user → one email).
- Requeue reset logic (failed segments → uploaded, attempts 0, job →
  recording_complete, error cleared).
- Worker: with a mocked Gemini client throwing `GeminiSpendCapError`, asserts the
  job is tagged+held (not failed, attempts unchanged) and the alert opens once;
  with an active alert, `runWorker` short-circuits to `{ paused: true }`.

## Operator setup (after merge)

1. Apply `supabase/schema-alerts.sql` in the Supabase SQL editor.
2. Create the two Loops transactional templates; set
   `LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID` and
   `LOOPS_BACK_ONLINE_TRANSACTIONAL_ID`.
3. Confirm `NEWSROOM_ADMIN_EMAILS` is set (admin recipient list + gate).
