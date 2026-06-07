# Gemini Spend-Cap Resilience + Admin Jobs Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect the Gemini monthly spend-cap error, hold affected jobs without losing work, alert the operator once, show users an honest "at capacity" screen, and let an admin click one button to restore + auto-resume + notify — plus admin-jobs visibility upgrades (copyable IDs, heartbeat/stuck indicator, per-job requeue).

**Architecture:** A typed `GeminiSpendCapError` is thrown from the Gemini wrapper when a 429/`RESOURCE_EXHAUSTED` carries cap/billing wording. The durable worker (`api/jobs/tick`) short-circuits while an incident is open and, on catching the typed error, tags the job (`error='gemini_spend_cap'`, no attempt burned, segment reset) and marks the note with a `hold` flag instead of failing. A `system_alerts` table records one active incident per type; the worker opens it (emailing the operator once) and an admin endpoint resolves it (clearing tags → auto-resume + per-user "back online" email). The browser watchers already poll `notes.content`; they read the new `hold` flag to flip the processing overlay to a red "at capacity" state.

**Tech Stack:** Next.js (App Router, route handlers), TypeScript, Supabase (service-role admin client + RLS), `@google/genai`, Loops transactional email, Vitest (node env), Tailwind, framer-motion, lucide-react.

---

## File Structure

**Create:**
- `src/lib/gemini-errors.ts` — pure error classifier + `GeminiSpendCapError` (no `server-only`, no SDK import → unit-testable).
- `src/lib/gemini-errors.test.ts` — classifier tests.
- `src/lib/alerts.ts` — `system_alerts` data helpers (`server-only`, admin client) + pure decision helpers.
- `src/lib/alerts.test.ts` — pure-helper tests (`shouldNotifyAdmin`, `distinctUserIds`).
- `src/lib/admin-notify.ts` — Loops wrappers: `sendSpendCapAdminAlert`, `sendBackOnlineEmail`.
- `supabase/schema-alerts.sql` — `system_alerts` table + RLS.
- `src/app/api/admin/gemini/status/route.ts` — incident status for the button.
- `src/app/api/admin/gemini/resolve/route.ts` — resolve incident, clear holds, notify.
- `src/app/api/admin/jobs/[id]/requeue/route.ts` — per-job requeue.
- `src/components/admin/gemini-restore-button.tsx` — client restore button + tooltip.
- `src/components/admin/job-row.tsx` — client row: copyable IDs + health dot + requeue button.
- `src/lib/job-health.ts` — pure `deriveJobHealth` + `isSpendCapHeld`.
- `src/lib/job-health.test.ts` — health/hold tests.

**Modify:**
- `src/lib/types.ts` — add `SystemAlert`/`SystemAlertType`, `hold` on `StructuredNotes`.
- `src/lib/gemini.ts` — throw `GeminiSpendCapError` on cap classification.
- `src/app/api/jobs/tick/route.ts` — short-circuit + spend-cap catch/hold.
- `src/lib/jobs-retention.ts` — `isStaleCleanupExempt` predicate.
- `src/lib/jobs-cleanup.ts` — skip held jobs while incident active.
- `src/components/admin/job-list.tsx` — use `JobRow`, surface health.
- `src/lib/admin-jobs.ts` — extend `AdminJobRow` with health/heartbeat fields.
- `src/app/(app)/admin/jobs/page.tsx` — compute health fields, mount restore button.
- `src/components/upload/processing-overlay.tsx` — `capacity` issue variant (red glow).
- `src/components/upload/uploader.tsx` — watcher detects `hold` → capacity issue.
- `src/components/recording/recording-context.tsx` — `ProcessingIssueKind` adds `capacity`; watcher detects `hold`.
- `src/components/notes/processing-watcher.tsx` (+ note page) — held note shows capacity copy, doesn't reload.

---

## Task 1: Gemini error classification

**Files:**
- Create: `src/lib/gemini-errors.ts`
- Test: `src/lib/gemini-errors.test.ts`
- Modify: `src/lib/gemini.ts:359-423` (and `transcribeSegment`, `composeNotes`)

- [ ] **Step 1: Write the failing test**

Create `src/lib/gemini-errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GeminiSpendCapError, classifyGeminiError } from "./gemini-errors";

describe("classifyGeminiError", () => {
  it("flags the monthly spending cap as spend_cap", () => {
    const err = {
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Your billing account has exceeded its monthly spending cap",
      },
    };
    expect(classifyGeminiError(err)).toBe("spend_cap");
  });

  it("flags a bare 429 rate limit as rate_limit, not spend_cap", () => {
    const err = { status: "RESOURCE_EXHAUSTED", message: "Resource has been exhausted (e.g. check quota)." };
    // 'quota' counts as a cap signal per spec; use a pure rate-limit message:
    const rate = { code: 429, message: "Too many requests, please retry." };
    expect(classifyGeminiError(rate)).toBe("rate_limit");
    expect(classifyGeminiError(err)).toBe("spend_cap"); // 'quota' → cap
  });

  it("reads nested SDK error shapes and plain Error messages", () => {
    expect(
      classifyGeminiError(new Error("429 RESOURCE_EXHAUSTED: monthly spending cap exceeded"))
    ).toBe("spend_cap");
  });

  it("returns other for unrelated errors", () => {
    expect(classifyGeminiError(new Error("ECONNRESET"))).toBe("other");
    expect(classifyGeminiError(null)).toBe("other");
  });

  it("GeminiSpendCapError is named and instanceof Error", () => {
    const e = new GeminiSpendCapError("cap");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("GeminiSpendCapError");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/gemini-errors.test.ts`
Expected: FAIL — cannot find module `./gemini-errors`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/gemini-errors.ts`:

```ts
/**
 * Pure classification of Gemini API errors. No `server-only`, no SDK import, so
 * it stays unit-testable and importable from the worker. Distinguishes the
 * monthly billing/spend cap (which won't recover until the cap is raised) from
 * an ordinary rate/quota burst (which the worker may keep retrying).
 */
export class GeminiSpendCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiSpendCapError";
  }
}

export type GeminiErrorKind = "spend_cap" | "rate_limit" | "other";

/** Pull code/status/message out of the various shapes the SDK throws. */
function readError(err: unknown): { code?: number; status?: string; message: string } {
  if (err == null) return { message: "" };
  if (typeof err === "string") return { message: err };
  const anyErr = err as Record<string, unknown>;
  const nested = (anyErr.error as Record<string, unknown> | undefined) ?? anyErr;
  const code = Number(nested.code ?? anyErr.code);
  const status = String(nested.status ?? anyErr.status ?? "");
  const message = String(nested.message ?? anyErr.message ?? (err as Error)?.message ?? "");
  return {
    code: Number.isFinite(code) ? code : undefined,
    status: status || undefined,
    message,
  };
}

const CAP_SIGNAL = /spend|billing|quota|cap/i;

export function classifyGeminiError(err: unknown): GeminiErrorKind {
  const { code, status, message } = readError(err);
  const exhausted = status === "RESOURCE_EXHAUSTED" || code === 429 || /RESOURCE_EXHAUSTED|\b429\b/.test(message);
  if (!exhausted) return "other";
  return CAP_SIGNAL.test(message) ? "spend_cap" : "rate_limit";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/gemini-errors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the classifier into `src/lib/gemini.ts`**

Add the import near the top (after the existing imports):

```ts
import { GeminiSpendCapError, classifyGeminiError } from "./gemini-errors";
```

Wrap each of the three `ai.models.generateContent(...)`/files calls so a spend-cap re-throws the typed error. Add this helper above `transcribeSegment` and use it at each call site:

```ts
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
```

In `transcribeSegment`, change:

```ts
  const response = await ai.models.generateContent({ ... });
```
to:
```ts
  const response = await callGemini(() => ai.models.generateContent({ ... }));
```

Do the same for the `generateContent` call in `composeNotes` and both `ai.files.upload`/`generateContent` in `generateNotesFromAudio` (wrap the whole `try` body's network calls; simplest is to wrap each `await` that hits the network in `callGemini(() => ...)`).

- [ ] **Step 6: Verify the project still typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gemini-errors.ts src/lib/gemini-errors.test.ts src/lib/gemini.ts
git commit -m "feat: classify Gemini spend-cap errors as a typed error"
```

---

## Task 2: system_alerts table + types

**Files:**
- Create: `supabase/schema-alerts.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the schema**

Create `supabase/schema-alerts.sql`:

```sql
-- ---------------------------------------------------------------------------
-- System incident flags (e.g. Gemini monthly spend cap reached). One active
-- row per type at a time. Apply in the Supabase SQL editor; safe to re-run.
-- ---------------------------------------------------------------------------
create table if not exists public.system_alerts (
  id                uuid primary key default gen_random_uuid(),
  type              text not null,
  active            boolean not null default true,
  first_detected_at timestamptz not null default now(),
  last_detected_at  timestamptz not null default now(),
  notification_sent boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- Enforce at most one active alert per type (the worker relies on this for
-- idempotent open-on-conflict).
create unique index if not exists system_alerts_active_type_idx
  on public.system_alerts (type)
  where active;

-- All access is via the service-role client (worker + admin route handlers),
-- which bypasses RLS. Enable RLS with no policies so nothing is reachable from
-- the browser anon/auth role.
alter table public.system_alerts enable row level security;
```

- [ ] **Step 2: Add types**

In `src/lib/types.ts`, add near the other domain types:

```ts
/** Kinds of system-wide incident tracked in `public.system_alerts`. */
export type SystemAlertType = "GEMINI_SPEND_CAP";

/** A row in `public.system_alerts`. */
export interface SystemAlert {
  id: string;
  type: SystemAlertType;
  active: boolean;
  first_detected_at: string;
  last_detected_at: string;
  notification_sent: boolean;
  resolved_at: string | null;
  created_at: string;
}
```

And extend `StructuredNotes` (the `status` block, around `types.ts:48-50`) with a hold flag:

```ts
  /**
   * Set while the note's job is held by a system incident (e.g. the Gemini
   * spend cap). Kept alongside status: "processing" so watchers can show an
   * honest "at capacity" state without treating the note as finished. Cleared
   * when the incident resolves and the job resumes.
   */
  hold?: "gemini_spend_cap" | null;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema-alerts.sql src/lib/types.ts
git commit -m "feat: add system_alerts table and incident types"
```

---

## Task 3: Alert + notify helpers (pure helpers TDD'd)

**Files:**
- Create: `src/lib/alerts.ts`, `src/lib/alerts.test.ts`, `src/lib/admin-notify.ts`

- [ ] **Step 1: Write the failing test for the pure helpers**

Create `src/lib/alerts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { distinctUserIds, shouldNotifyAdmin } from "./alerts";

describe("shouldNotifyAdmin", () => {
  it("notifies when the alert was just created", () => {
    expect(shouldNotifyAdmin({ created: true, notification_sent: false })).toBe(true);
  });
  it("notifies when an existing alert was never emailed", () => {
    expect(shouldNotifyAdmin({ created: false, notification_sent: false })).toBe(true);
  });
  it("does not notify when already emailed", () => {
    expect(shouldNotifyAdmin({ created: false, notification_sent: true })).toBe(false);
  });
});

describe("distinctUserIds", () => {
  it("dedupes user ids across multiple held jobs", () => {
    const jobs = [{ user_id: "a" }, { user_id: "b" }, { user_id: "a" }];
    expect(distinctUserIds(jobs).sort()).toEqual(["a", "b"]);
  });
  it("returns an empty array for no jobs", () => {
    expect(distinctUserIds([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/alerts.test.ts`
Expected: FAIL — cannot find module `./alerts`.

- [ ] **Step 3: Implement `src/lib/alerts.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SystemAlert, SystemAlertType } from "@/lib/types";

/** Pure: decide whether the operator email should fire for this open. */
export function shouldNotifyAdmin(input: { created: boolean; notification_sent: boolean }): boolean {
  return input.created || !input.notification_sent;
}

/** Pure: distinct user ids across held jobs. */
export function distinctUserIds(jobs: { user_id: string }[]): string[] {
  return [...new Set(jobs.map((j) => j.user_id))];
}

export async function getActiveAlert(type: SystemAlertType): Promise<SystemAlert | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("system_alerts")
    .select("*")
    .eq("type", type)
    .eq("active", true)
    .maybeSingle();
  return (data as SystemAlert | null) ?? null;
}

/**
 * Open (or refresh) the active alert for a type. Idempotent: the partial unique
 * index guarantees one active row, so a race resolves to a touch of the winner.
 */
export async function openAlert(
  type: SystemAlertType
): Promise<{ alert: SystemAlert; created: boolean }> {
  const db = createAdminClient();
  const existing = await getActiveAlert(type);
  if (existing) {
    await db
      .from("system_alerts")
      .update({ last_detected_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { alert: existing, created: false };
  }
  const { data, error } = await db
    .from("system_alerts")
    .insert({ type })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    // Lost the insert race against another worker — fetch the winner.
    const winner = await getActiveAlert(type);
    if (winner) return { alert: winner, created: false };
    throw error ?? new Error("Failed to open alert.");
  }
  return { alert: data as SystemAlert, created: true };
}

export async function markNotified(id: string): Promise<void> {
  const db = createAdminClient();
  await db.from("system_alerts").update({ notification_sent: true }).eq("id", id);
}

export async function resolveAlert(type: SystemAlertType): Promise<SystemAlert | null> {
  const db = createAdminClient();
  const existing = await getActiveAlert(type);
  if (!existing) return null;
  await db
    .from("system_alerts")
    .update({ active: false, resolved_at: new Date().toISOString() })
    .eq("id", existing.id);
  return existing;
}
```

- [ ] **Step 4: Run to verify the pure tests pass**

Run: `npx vitest run src/lib/alerts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement `src/lib/admin-notify.ts`**

```ts
import "server-only";
import { sendLoopsEmail } from "@/lib/loops";

const ADMIN_TEMPLATE = process.env.LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID;
const BACK_ONLINE_TEMPLATE = process.env.LOOPS_BACK_ONLINE_TRANSACTIONAL_ID;

/** Comma/space separated admin recipients (reuses the newsroom admin list). */
function adminEmails(): string[] {
  return (process.env.NEWSROOM_ADMIN_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Email every operator once per incident. Never throws. */
export async function sendSpendCapAdminAlert(alertId: string): Promise<void> {
  if (!ADMIN_TEMPLATE) {
    console.warn("LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID not set; skipping admin alert.");
    return;
  }
  for (const email of adminEmails()) {
    try {
      await sendLoopsEmail({
        transactionalId: ADMIN_TEMPLATE,
        email,
        addToAudience: false,
        dataVariables: { detectedAt: new Date().toISOString() },
        idempotencyKey: `spend-cap-admin-${alertId}-${email}`,
      });
    } catch (err) {
      console.error(`Spend-cap admin alert to ${email} failed:`, err);
    }
  }
}

/** Email one affected user that processing is restored. Never throws. */
export async function sendBackOnlineEmail(email: string, alertId: string): Promise<void> {
  if (!BACK_ONLINE_TEMPLATE) {
    console.warn("LOOPS_BACK_ONLINE_TRANSACTIONAL_ID not set; skipping back-online email.");
    return;
  }
  try {
    await sendLoopsEmail({
      transactionalId: BACK_ONLINE_TEMPLATE,
      email,
      addToAudience: false,
      idempotencyKey: `back-online-${alertId}-${email}`,
    });
  } catch (err) {
    console.error(`Back-online email to ${email} failed:`, err);
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/alerts.ts src/lib/alerts.test.ts src/lib/admin-notify.ts
git commit -m "feat: add system-alert data helpers and incident email senders"
```

---

## Task 4: Worker — short-circuit + spend-cap hold

**Files:**
- Modify: `src/app/api/jobs/tick/route.ts`

- [ ] **Step 1: Add imports**

At the top of `src/app/api/jobs/tick/route.ts` add:

```ts
import { GeminiSpendCapError } from "@/lib/gemini-errors";
import { getActiveAlert, openAlert, markNotified, shouldNotifyAdmin } from "@/lib/alerts";
import { sendSpendCapAdminAlert } from "@/lib/admin-notify";
```

- [ ] **Step 2: Add the hold helper inside the route module**

Add this function near `failedContent` (top of file):

```ts
/**
 * Record a Gemini spend-cap hit: open/refresh the incident (emailing the
 * operator once), tag the job as held (no attempt burned), mark its note so the
 * browser can show the "at capacity" screen, and reset any in-flight segment.
 * Never throws — holding must always succeed so the job is preserved.
 */
async function holdJobForSpendCap(
  db: ReturnType<typeof createAdminClient>,
  job: LectureJobRecord,
  inFlightSegmentId: string | null
) {
  try {
    const { alert, created } = await openAlert("GEMINI_SPEND_CAP");
    if (shouldNotifyAdmin({ created, notification_sent: alert.notification_sent })) {
      await sendSpendCapAdminAlert(alert.id);
      await markNotified(alert.id);
    }
  } catch (err) {
    console.error("Failed to open spend-cap alert:", err);
  }

  const stamp = new Date().toISOString();
  await db
    .from("lecture_jobs")
    .update({ error: "gemini_spend_cap", heartbeat_at: null, updated_at: stamp })
    .eq("id", job.id);

  if (inFlightSegmentId) {
    await db
      .from("lecture_segments")
      .update({ status: "uploaded", updated_at: stamp })
      .eq("id", inFlightSegmentId);
  }

  // Mark the note (keep status: processing) so the watcher flips to capacity.
  if (job.note_id) {
    const { data: noteRow } = await db
      .from("notes")
      .select("content")
      .eq("id", job.note_id)
      .maybeSingle();
    const content = (noteRow?.content as Record<string, unknown> | null) ?? {};
    await db
      .from("notes")
      .update({ content: { ...content, status: "processing", hold: "gemini_spend_cap" } })
      .eq("id", job.note_id);
  }
}
```

- [ ] **Step 3: Short-circuit at the top of `runWorker`**

Immediately after the `const db = createAdminClient();` line in `runWorker`, add:

```ts
  // Don't touch Gemini while a spend-cap incident is open — every call would
  // just fail and burn money/retries. Resume happens when an admin resolves it.
  if (await getActiveAlert("GEMINI_SPEND_CAP")) {
    return NextResponse.json({ paused: "spend_cap" });
  }
```

- [ ] **Step 4: Catch the typed error in the segment loop**

In the segment `try/catch` (around `tick/route.ts:171`), add a spend-cap branch *before* the existing generic catch logic. Replace:

```ts
      } catch (err) {
        const attempts = next.attempts + 1;
```
with:
```ts
      } catch (err) {
        if (err instanceof GeminiSpendCapError) {
          await holdJobForSpendCap(db, job, next.id);
          return NextResponse.json({ claimed: true, held: "spend_cap" });
        }
        const attempts = next.attempts + 1;
```

- [ ] **Step 5: Catch the typed error in the compose block**

In the compose `try/catch` (around `tick/route.ts:236`), add the same guard at the top of the `catch`:

```ts
      } catch (err) {
        if (err instanceof GeminiSpendCapError) {
          await holdJobForSpendCap(db, job, null);
          return NextResponse.json({ claimed: true, held: "spend_cap" });
        }
        console.error("Compose failed:", err);
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Manual verification note**

There is no unit harness for the route. Verify logic by inspection against these invariants: (a) an open incident returns `{ paused }` before any claim; (b) a `GeminiSpendCapError` sets `error='gemini_spend_cap'`, leaves `status`/`attempts` untouched, resets the in-flight segment to `uploaded`, and writes `content.hold`; (c) non-cap errors keep today's retry/fail behavior. Record this in the commit body.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/jobs/tick/route.ts
git commit -m "feat: hold jobs on Gemini spend cap instead of failing them

Worker short-circuits while an incident is open and, on a typed spend-cap
error, tags the job held (no attempt burned), resets the in-flight segment,
and marks the note content.hold. Non-cap errors keep prior retry/fail logic."
```

---

## Task 5: Admin status + resolve endpoints

**Files:**
- Create: `src/app/api/admin/gemini/status/route.ts`, `src/app/api/admin/gemini/resolve/route.ts`

- [ ] **Step 1: Implement the status endpoint**

Create `src/app/api/admin/gemini/status/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { getActiveAlert, distinctUserIds } from "@/lib/alerts";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const alert = await getActiveAlert("GEMINI_SPEND_CAP");
  if (!alert) {
    return NextResponse.json({ active: false, since: null, affectedJobs: 0, affectedUsers: 0 });
  }

  const db = createAdminClient();
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("user_id")
    .eq("error", "gemini_spend_cap")
    .neq("status", "ready");
  const heldJobs = (jobs ?? []) as { user_id: string }[];

  return NextResponse.json({
    active: true,
    since: alert.first_detected_at,
    affectedJobs: heldJobs.length,
    affectedUsers: distinctUserIds(heldJobs).length,
  });
}
```

- [ ] **Step 2: Implement the resolve endpoint**

Create `src/app/api/admin/gemini/resolve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { resolveAlert, distinctUserIds } from "@/lib/alerts";
import { sendBackOnlineEmail } from "@/lib/admin-notify";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function kickTick(request: Request) {
  const secret = [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .find((s): s is string => !!s);
  if (!secret) return;
  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, { method: "POST", headers: { "x-jobs-secret": secret } }).catch(() => {});
}

export async function POST(request: Request) {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const alert = await resolveAlert("GEMINI_SPEND_CAP");
  if (!alert) return NextResponse.json({ resolved: true, requeued: 0, notified: 0 });

  const db = createAdminClient();

  // Snapshot held jobs (user ids + note ids) before clearing the tags.
  const { data: jobs } = await db
    .from("lecture_jobs")
    .select("id, user_id, note_id")
    .eq("error", "gemini_spend_cap")
    .neq("status", "ready");
  const heldJobs = (jobs ?? []) as { id: string; user_id: string; note_id: string | null }[];

  // Clear the hold tag → jobs become reclaimable and resume on the next tick.
  if (heldJobs.length > 0) {
    await db
      .from("lecture_jobs")
      .update({ error: null, updated_at: new Date().toISOString() })
      .eq("error", "gemini_spend_cap")
      .neq("status", "ready");

    // Clear the note hold marker so the overlay returns to normal processing.
    for (const job of heldJobs) {
      if (!job.note_id) continue;
      const { data: noteRow } = await db
        .from("notes")
        .select("content")
        .eq("id", job.note_id)
        .maybeSingle();
      const content = (noteRow?.content as Record<string, unknown> | null) ?? {};
      await db
        .from("notes")
        .update({ content: { ...content, status: "processing", hold: null } })
        .eq("id", job.note_id);
    }
  }

  // Email each distinct affected user once.
  const userIds = distinctUserIds(heldJobs);
  let notified = 0;
  for (const userId of userIds) {
    const { data: userRes } = await db.auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (email) {
      await sendBackOnlineEmail(email, alert.id);
      notified += 1;
    }
  }

  await kickTick(request);
  return NextResponse.json({ resolved: true, requeued: heldJobs.length, notified });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/gemini/status/route.ts src/app/api/admin/gemini/resolve/route.ts
git commit -m "feat: admin endpoints to read and resolve the Gemini spend-cap incident"
```

---

## Task 6: Per-job requeue endpoint

**Files:**
- Create: `src/app/api/admin/jobs/[id]/requeue/route.ts`

- [ ] **Step 1: Implement the endpoint**

Create `src/app/api/admin/jobs/[id]/requeue/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getNewsroomAdmin } from "@/lib/newsroom-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function kickTick(request: Request) {
  const secret = [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .find((s): s is string => !!s);
  if (!secret) return;
  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, { method: "POST", headers: { "x-jobs-secret": secret } }).catch(() => {});
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getNewsroomAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await ctx.params;
  const db = createAdminClient();

  const { data: job } = await db
    .from("lecture_jobs")
    .select("id, note_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const stamp = new Date().toISOString();

  // Reset failed segments back into the queue (don't touch transcribed ones).
  await db
    .from("lecture_segments")
    .update({ status: "uploaded", attempts: 0, updated_at: stamp })
    .eq("job_id", id)
    .eq("status", "failed");

  await db
    .from("lecture_jobs")
    .update({ status: "recording_complete", error: null, heartbeat_at: null, updated_at: stamp })
    .eq("id", id);

  // A previously-failed job overwrote its note with a "Processing failed"
  // placeholder — reset it to processing so the user sees it working again.
  if (job.status === "failed" && job.note_id) {
    const { data: noteRow } = await db
      .from("notes")
      .select("content")
      .eq("id", job.note_id)
      .maybeSingle();
    const content = (noteRow?.content as Record<string, unknown> | null) ?? {};
    await db
      .from("notes")
      .update({
        title: "Processing…",
        content: { ...content, status: "processing", hold: null, title: "Processing…" },
      })
      .eq("id", job.note_id);
  }

  await kickTick(request);
  return NextResponse.json({ requeued: true });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/jobs/[id]/requeue/route.ts"
git commit -m "feat: admin per-job requeue endpoint"
```

---

## Task 7: Cleanup exemption for held jobs

**Files:**
- Modify: `src/lib/jobs-retention.ts`, `src/lib/jobs-cleanup.ts`
- Test: `src/lib/jobs-retention.test.ts` (existing file — add cases)

- [ ] **Step 1: Write the failing test**

Append to `src/lib/jobs-retention.test.ts`:

```ts
import { isStaleCleanupExempt } from "./jobs-retention";

describe("isStaleCleanupExempt", () => {
  it("exempts spend-cap-held jobs while an incident is active", () => {
    expect(isStaleCleanupExempt({ error: "gemini_spend_cap" }, true)).toBe(true);
  });
  it("does not exempt held jobs once the incident is resolved", () => {
    expect(isStaleCleanupExempt({ error: "gemini_spend_cap" }, false)).toBe(false);
  });
  it("does not exempt ordinary jobs", () => {
    expect(isStaleCleanupExempt({ error: null }, true)).toBe(false);
    expect(isStaleCleanupExempt({ error: "compose" }, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/jobs-retention.test.ts`
Expected: FAIL — `isStaleCleanupExempt` is not exported.

- [ ] **Step 3: Implement the predicate**

Add to `src/lib/jobs-retention.ts`:

```ts
/**
 * Spend-cap-held jobs must survive stale cleanup while the incident is open —
 * otherwise a multi-hour cap would purge work that is about to auto-resume.
 */
export function isStaleCleanupExempt(
  job: { error: string | null },
  spendCapIncidentActive: boolean
): boolean {
  return spendCapIncidentActive && job.error === "gemini_spend_cap";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/jobs-retention.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply the exemption in cleanup**

In `src/lib/jobs-cleanup.ts`:

Add imports:
```ts
import { getActiveAlert } from "@/lib/alerts";
import { isStaleCleanupExempt } from "@/lib/jobs-retention";
```

Select `error` on the incomplete-jobs query (line ~50): change
```ts
    .select("id, note_id, status, created_at, updated_at, heartbeat_at")
```
to
```ts
    .select("id, note_id, status, error, created_at, updated_at, heartbeat_at")
```
and widen the `Pick<...>` type below it to include `"error"`.

Compute the incident flag once near the top of `runJobCleanup` (after `const db = ...`):
```ts
  const spendCapActive = !!(await getActiveAlert("GEMINI_SPEND_CAP"));
```

In the `staleJobs` filter, exempt held jobs — change the `.filter((job) => {` body to return false early:
```ts
    const staleJobs = incompleteRows.filter((job) => {
      if (isStaleCleanupExempt(job, spendCapActive)) return false;
      const segments = segmentsByJob.get(job.id) ?? [];
      // ...existing body unchanged...
    });
```

- [ ] **Step 6: Typecheck + run full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: typecheck clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/jobs-retention.ts src/lib/jobs-retention.test.ts src/lib/jobs-cleanup.ts
git commit -m "feat: exempt spend-cap-held jobs from stale cleanup during an incident"
```

---

## Task 8: Job health helper (pure)

**Files:**
- Create: `src/lib/job-health.ts`, `src/lib/job-health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/job-health.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveJobHealth } from "./job-health";

const LEASE = 90_000;
const now = Date.parse("2026-06-06T12:00:00Z");
const fresh = new Date(now - 10_000).toISOString();
const stale = new Date(now - 200_000).toISOString();

describe("deriveJobHealth", () => {
  it("reports held when tagged with the spend cap and an incident is active", () => {
    const h = deriveJobHealth({ status: "processing", error: "gemini_spend_cap", heartbeatAt: null }, { now, leaseMs: LEASE, spendCapActive: true });
    expect(h.key).toBe("held");
  });
  it("reports running for a processing job with a fresh heartbeat", () => {
    const h = deriveJobHealth({ status: "processing", error: null, heartbeatAt: fresh }, { now, leaseMs: LEASE, spendCapActive: false });
    expect(h.key).toBe("running");
  });
  it("reports stuck for an open job with a stale heartbeat", () => {
    const h = deriveJobHealth({ status: "processing", error: null, heartbeatAt: stale }, { now, leaseMs: LEASE, spendCapActive: false });
    expect(h.key).toBe("stuck");
  });
  it("reports failed/ready/idle for terminal or pre-work states", () => {
    expect(deriveJobHealth({ status: "failed", error: "compose", heartbeatAt: null }, { now, leaseMs: LEASE, spendCapActive: false }).key).toBe("failed");
    expect(deriveJobHealth({ status: "ready", error: null, heartbeatAt: null }, { now, leaseMs: LEASE, spendCapActive: false }).key).toBe("ready");
    expect(deriveJobHealth({ status: "recording", error: null, heartbeatAt: null }, { now, leaseMs: LEASE, spendCapActive: false }).key).toBe("idle");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/job-health.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/lib/job-health.ts`**

```ts
import type { LectureJobStatus } from "./types";

export type JobHealthKey = "held" | "running" | "stuck" | "failed" | "ready" | "idle";

export interface JobHealth {
  key: JobHealthKey;
  label: string;
}

export interface JobHealthInput {
  status: LectureJobStatus;
  error: string | null;
  heartbeatAt: string | null;
}

export function isSpendCapHeld(error: string | null): boolean {
  return error === "gemini_spend_cap";
}

function leaseStale(heartbeatAt: string | null, now: number, leaseMs: number): boolean {
  if (!heartbeatAt) return true;
  return now - new Date(heartbeatAt).getTime() > leaseMs;
}

/** Derive a single coarse health badge for the admin jobs list. */
export function deriveJobHealth(
  job: JobHealthInput,
  opts: { now?: number; leaseMs?: number; spendCapActive?: boolean } = {}
): JobHealth {
  const now = opts.now ?? Date.now();
  const leaseMs = opts.leaseMs ?? 90_000;
  if (opts.spendCapActive && isSpendCapHeld(job.error)) {
    return { key: "held", label: "Held · at capacity" };
  }
  if (job.status === "ready") return { key: "ready", label: "Ready" };
  if (job.status === "failed") return { key: "failed", label: "Failed" };
  if (job.status === "processing" || job.status === "recording_complete") {
    return leaseStale(job.heartbeatAt, now, leaseMs)
      ? { key: "stuck", label: "Stuck" }
      : { key: "running", label: "Running" };
  }
  return { key: "idle", label: "Idle" };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/job-health.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/job-health.ts src/lib/job-health.test.ts
git commit -m "feat: pure job-health derivation for the admin jobs list"
```

---

## Task 9: Admin jobs UI — health, copyable IDs, requeue button, restore button

**Files:**
- Modify: `src/lib/admin-jobs.ts`, `src/app/(app)/admin/jobs/page.tsx`, `src/components/admin/job-list.tsx`
- Create: `src/components/admin/job-row.tsx`, `src/components/admin/gemini-restore-button.tsx`

- [ ] **Step 1: Extend `AdminJobRow`**

In `src/lib/admin-jobs.ts`, add fields to the `AdminJobRow` type:

```ts
  health: import("@/lib/job-health").JobHealthKey;
  healthLabel: string;
```

- [ ] **Step 2: Compute health + pass incident flag in the page**

In `src/app/(app)/admin/jobs/page.tsx`:

Add imports:
```ts
import { deriveJobHealth } from "@/lib/job-health";
import { JOBS_LEASE_MS } from "@/lib/jobs";
import { getActiveAlert } from "@/lib/alerts";
import { GeminiRestoreButton } from "@/components/admin/gemini-restore-button";
```

After `const db = createAdminClient();` add:
```ts
  const spendCapActive = !!(await getActiveAlert("GEMINI_SPEND_CAP"));
```

Add `error` to the jobs `.select(...)` string (it already selects `error`). Inside the `rows` map, compute and include health:
```ts
    const health = deriveJobHealth(
      { status: job.status, error: job.error, heartbeatAt: job.heartbeat_at },
      { now, leaseMs: JOBS_LEASE_MS, spendCapActive }
    );
```
and add to the returned object:
```ts
      health: health.key,
      healthLabel: health.label,
```

Render the restore button above the heading block (inside the `max-w-6xl` div, before the `<div className="mt-4">`):
```tsx
        <div className="mt-4">
          <GeminiRestoreButton />
        </div>
```

- [ ] **Step 3: Create the restore button component**

Create `src/components/admin/gemini-restore-button.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Status {
  active: boolean;
  affectedJobs: number;
  affectedUsers: number;
  since: string | null;
}

export function GeminiRestoreButton() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gemini/status", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as Status);
    } catch {
      /* leave previous status */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const resolve = useCallback(async () => {
    if (!status?.active) return;
    if (!window.confirm(`Mark Gemini processing restored? ${status.affectedJobs} job(s) will resume and ${status.affectedUsers} user(s) will be emailed.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/gemini/resolve", { method: "POST" });
      const body = (await res.json()) as { requeued?: number; notified?: number };
      if (res.ok) {
        window.alert(`Restored — ${body.requeued ?? 0} job(s) requeued, ${body.notified ?? 0} user(s) notified.`);
      } else {
        window.alert("Couldn't resolve the incident.");
      }
    } finally {
      setBusy(false);
      void load();
    }
  }, [status, load]);

  const active = status?.active === true;

  const button = (
    <Button
      onClick={resolve}
      disabled={!active || busy}
      className={
        active
          ? "h-10 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          : "h-10 gap-2"
      }
      variant={active ? "default" : "outline"}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
      {active
        ? `Gemini at capacity — ${status?.affectedJobs ?? 0} held · Mark restored`
        : "Gemini processing — healthy"}
    </Button>
  );

  if (active) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent>Gemini API is processing normally.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Note: confirm the tooltip primitive path. Run `ls src/components/ui/tooltip.tsx`; if absent, add it via `npx shadcn@latest add tooltip` or replace the tooltip wrapper with a `title` attribute on the `<span>`.

- [ ] **Step 4: Create the client job row**

Create `src/components/admin/job-row.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Copy, Check, RefreshCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, formatAdminId, type AdminJobRow } from "@/lib/admin-jobs";
import { formatAutoDeleteCountdown } from "@/lib/jobs-retention";
import type { JobHealthKey } from "@/lib/job-health";

const HEALTH_DOT: Record<JobHealthKey, string> = {
  held: "bg-rose-500",
  running: "bg-emerald-500",
  stuck: "bg-amber-500",
  failed: "bg-rose-500",
  ready: "bg-emerald-500",
  idle: "bg-muted-foreground/40",
};

function CopyId({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">{label} —</span>;
  return (
    <button
      type="button"
      title={`${label} ${value} (click to copy)`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 text-foreground hover:text-primary"
    >
      {label} {formatAdminId(value)}
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 opacity-50" />}
    </button>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

export function JobRow({ job }: { job: AdminJobRow }) {
  const [requeuing, setRequeuing] = useState(false);
  const canRequeue = job.health === "failed" || job.health === "stuck";

  async function requeue() {
    setRequeuing(true);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/requeue`, { method: "POST" });
      if (res.ok) window.location.reload();
      else window.alert("Couldn't requeue this job.");
    } finally {
      setRequeuing(false);
    }
  }

  return (
    <tr className="align-top transition hover:bg-secondary/40">
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider", JOB_STATUS_TONES[job.status])}>
            <span className="size-1.5 bg-current" />
            {JOB_STATUS_LABELS[job.status]}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", HEALTH_DOT[job.health])} />
            {job.healthLabel}
          </span>
          {job.error && job.health !== "held" ? (
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-rose-500">{job.error}</span>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs">
          <CopyId label="job" value={job.id} />
          <CopyId label="note" value={job.noteId} />
        </div>
      </td>
      <td className="px-4 py-3.5"><CopyId label="user" value={job.userId} /></td>
      <td className="px-4 py-3.5 text-muted-foreground">
        <p>{job.segmentRows}{job.segmentCount != null ? ` / ${job.segmentCount}` : ""} uploaded</p>
        {job.uploadedSegments > 0 ? <p className="mt-0.5 text-xs">{job.uploadedSegments} awaiting transcription</p> : null}
      </td>
      <td className="px-4 py-3.5 text-muted-foreground">{formatTimestamp(job.lastActivityAt)}</td>
      <td className="px-4 py-3.5">
        <p className="font-medium">{formatAutoDeleteCountdown(Date.parse(job.autoDeleteAt))}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatTimestamp(job.autoDeleteAt)}</p>
        {canRequeue ? (
          <button onClick={requeue} disabled={requeuing} className="mt-1.5 inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs hover:bg-secondary">
            {requeuing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}
            Requeue
          </button>
        ) : null}
      </td>
    </tr>
  );
}
```

- [ ] **Step 5: Use `JobRow` in the list**

In `src/components/admin/job-list.tsx`, replace the inline `<tr>` map body with the new row. Keep `JobStatusChip` export if used elsewhere; change the table body to:

```tsx
import { JobRow } from "@/components/admin/job-row";
// ...
        <tbody className="divide-y">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </tbody>
```

- [ ] **Step 6: Typecheck + build the admin route**

Run: `npx tsc --noEmit`
Expected: no new errors. (If the tooltip import path is wrong, fix per Step 3 note.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin-jobs.ts "src/app/(app)/admin/jobs/page.tsx" src/components/admin/job-list.tsx src/components/admin/job-row.tsx src/components/admin/gemini-restore-button.tsx
git commit -m "feat: admin jobs health dots, copyable IDs, per-job requeue, restore button"
```

---

## Task 10: Processing overlay — capacity variant

**Files:**
- Modify: `src/components/upload/processing-overlay.tsx`, `src/components/recording/recording-context.tsx`

- [ ] **Step 1: Widen the issue kind**

In `src/components/recording/recording-context.tsx:67`, change:

```ts
export type ProcessingIssueKind = "silent" | "timeout" | "failed";
```
to:
```ts
export type ProcessingIssueKind = "silent" | "timeout" | "failed" | "capacity";
```

And in `src/components/upload/processing-overlay.tsx`, update the local `ProcessingIssue["kind"]` union (line ~27) to match:

```ts
export interface ProcessingIssue {
  kind: "silent" | "timeout" | "failed" | "capacity";
  title: string;
  message: string;
}
```

- [ ] **Step 2: Add a `capacity` branch to the overlay**

In `processing-overlay.tsx`, add a derived flag after `const failed = !!issue;`:

```ts
  const capacity = issue?.kind === "capacity";
```

Replace the glow conditional (the `{failed ? (...destructive blur...) : (...AiGlow...)}` block, lines ~80-95) so capacity gets a mid-tone red bloom that reads on light *and* dark:

```tsx
          {capacity ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/35 opacity-70 blur-3xl dark:bg-rose-500/30"
            />
          ) : failed ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/20 opacity-35 blur-3xl"
            />
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(120%_90%_at_50%_50%,black,transparent_78%)]"
            >
              <AiGlow mode="active" blend blur={64} density="full" />
            </div>
          )}
```

For the icon tile, treat capacity like a non-spinning state with a rose tint. Change the icon-tile `className` ternary and icon:

```tsx
              className={cn(
                "grid size-16 place-items-center rounded-[6px] border bg-background/90 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_18px_50px_-22px_rgba(0,0,0,0.3)]",
                capacity
                  ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                  : failed
                  ? "border-destructive/30 text-destructive"
                  : "border-primary/30 text-primary"
              )}
```
and make the pulse stop for capacity too — change the `animate`/`transition` guards from `failed || reduceMotion` to `failed || capacity || reduceMotion`. Use the `AlertCircle` icon when `failed || capacity`.

- [ ] **Step 3: Capacity content + buttons**

The title/detail already come from `issue` (`title = issue?.title`, `detail = issue?.message`), so the planned copy flows through. Add a capacity-only reassurance box and a Back-to-dashboard link. After the existing `failed && onDiscard && onDownload` button block, add:

```tsx
            {capacity && (
              <>
                <div className="mt-5 inline-flex items-center gap-2 rounded-[6px] border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <Clock className="size-4 shrink-0" />
                  <span>
                    <span className="font-semibold">You can safely close this tab</span> — we&apos;ll finish your notes and email you when they&apos;re ready.
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-[6px] border border-border bg-card px-5 text-sm font-medium text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition hover:bg-secondary"
                >
                  <ArrowLeft className="size-4" />
                  Back to dashboard
                </Link>
              </>
            )}
```

`Clock`, `ArrowLeft`, `Link`, and `AlertCircle` are already imported. Ensure the amber "Keep this tab open" box stays gated on `!failed` (it already is — add `&& !capacity` to be safe: change its guard to `!failed && !capacity && stage !== "idle" && ...`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/upload/processing-overlay.tsx src/components/recording/recording-context.tsx
git commit -m "feat: capacity (spend-cap) variant for the processing overlay"
```

---

## Task 11: Watchers detect the hold → capacity state

**Files:**
- Modify: `src/components/upload/uploader.tsx`, `src/components/recording/recording-context.tsx`, `src/components/notes/processing-watcher.tsx`

The processing copy (reused in all three spots):

- Title: `Atlas is at capacity right now`
- Message: `Your recording is saved. Atlas AI is temporarily unable to process new recordings, and yours will finish automatically once processing is restored — you'll get an email when it's done.`

- [ ] **Step 1: Uploader watcher**

In `src/components/upload/uploader.tsx`, the uploader currently has no `issue` state. Add one and pass it to the overlay.

Add state near the other `useState`s (line ~107):
```tsx
  const [issue, setIssue] = useState<import("@/components/upload/processing-overlay").ProcessingIssue | null>(null);
```

In the watcher `check` (line ~266), branch on the hold before the terminal check:
```tsx
      const content = data?.content as { status?: string; hold?: string } | null;
      const status = content?.status;
      if (content?.hold === "gemini_spend_cap") {
        setIssue({
          kind: "capacity",
          title: "Atlas is at capacity right now",
          message:
            "Your recording is saved. Atlas AI is temporarily unable to process new recordings, and yours will finish automatically once processing is restored — you'll get an email when it's done.",
        });
        return; // stay on the overlay; do not navigate
      }
      if (data && status !== "processing") {
        // clear any prior capacity issue and navigate
        navigated = true;
        clearInterval(poll);
        window.location.assign(`/notes/${noteId}`);
      }
```

Pass the issue to the overlay (line ~415):
```tsx
      <ProcessingOverlay stage={stage} issue={issue} safeToLeave={safeToLeave} subLabel={prepareHint} />
```

- [ ] **Step 2: Recorder watcher**

In `src/components/recording/recording-context.tsx`, the `checkStatus` watcher (line ~1649) selects `content`. Add the same hold branch before the terminal check, calling the existing `setProcessingIssue`:

```tsx
      const content = data?.content as { status?: string; hold?: string } | null;
      const status = content?.status;
      if (content?.hold === "gemini_spend_cap") {
        setProcessingIssue({
          kind: "capacity",
          title: "Atlas is at capacity right now",
          message:
            "Your recording is saved. Atlas AI is temporarily unable to process new recordings, and yours will finish automatically once processing is restored — you'll get an email when it's done.",
        });
        return;
      }
      if (data && status !== "processing") {
        navigated = true;
        clearInterval(poll);
        window.location.assign(`/notes/${noteId}`);
      }
```

No extra wiring needed: `src/components/upload/recorder.tsx:308` already passes `issue={processingIssue}` to `ProcessingOverlay`, so emitting the capacity issue here is enough for the recorder pipeline to render it.

- [ ] **Step 3: Note-page held indicator**

In `src/components/notes/processing-watcher.tsx`, prevent the reload while held and surface a toast. In `check`, read `hold` and short-circuit:

```tsx
      const content = data?.content as { status?: string; hold?: string } | null;
      const status = content?.status;
      if (content?.hold === "gemini_spend_cap") return; // stay; held, not finished
      if (data && status !== "processing") {
        done = true;
        clearInterval(poll);
        window.location.reload();
      }
```

The note page's own processing placeholder (rendered server-side when `content.status === "processing"`) will keep showing. Optionally, in `src/app/(app)/notes/[id]/page.tsx`, when `content.hold === "gemini_spend_cap"`, render the capacity copy in place of the default "Atlas is writing your notes…" line. Locate the processing placeholder block and add a conditional message; if the page has no inline placeholder (it relies on the client components), leave the toast from `ProcessingWatcher` as the held signal and skip this sub-step.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

In dev, simulate by setting a note's `content.hold = "gemini_spend_cap"` (keep `status: "processing"`) via the Supabase table editor while the upload/record overlay is open; confirm the overlay flips to the red capacity state and does not navigate, and clearing `hold` (back to processing) lets it resume/navigate when ready.

- [ ] **Step 6: Commit**

```bash
git add src/components/upload/uploader.tsx src/components/recording/recording-context.tsx src/components/notes/processing-watcher.tsx "src/app/(app)/notes/[id]/page.tsx"
git commit -m "feat: surface spend-cap hold as the capacity overlay in both pipelines"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass (new: gemini-errors, alerts, job-health, jobs-retention additions).

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean typecheck, no new lint errors, successful build.

- [ ] **Step 3: Commit any fixups**

```bash
git add -A
git commit -m "chore: spend-cap resilience — fixups from full verification"
```

---

## Operator setup checklist (post-merge, not code)

1. Apply `supabase/schema-alerts.sql` in the Supabase SQL editor.
2. Create two Loops transactional templates and set env vars:
   - `LOOPS_SPEND_CAP_ADMIN_TRANSACTIONAL_ID`
   - `LOOPS_BACK_ONLINE_TRANSACTIONAL_ID`
3. Confirm `NEWSROOM_ADMIN_EMAILS` is set (admin recipients + admin-page gate).

---

## Notes for the implementer

- **No `server-only` in test imports:** `gemini-errors.ts`, `job-health.ts`, and the pure helpers in `alerts.ts`/`jobs-retention.ts` must stay free of SDK/`server-only` so Vitest (node env) imports them cleanly. `alerts.ts` *does* import `server-only` — its pure helpers (`shouldNotifyAdmin`, `distinctUserIds`) are still testable because the repo aliases `server-only` to a stub in `vitest.config.ts`.
- **Idempotency keys** on Loops sends prevent duplicate emails on ret/route retries — keep them.
- **Don't add a `LectureJobStatus` enum value** — "held" is derived from `error='gemini_spend_cap'` + active incident, by design.
- **Tooltip primitive:** verify `src/components/ui/tooltip.tsx` exists before using it in the restore button; fall back to a `title` attribute if not.
