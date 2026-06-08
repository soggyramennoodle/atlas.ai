import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import {
  composeNotes,
  enrichNoteWithResearch,
  shouldQueueResearchEnrichment,
  transcribeSegment,
} from "@/lib/gemini";
import { mimeFromKey } from "@/lib/upload-lecture";
import { buildMemoryContext } from "@/lib/memory";
import {
  JOBS_SEGMENT_CONCURRENCY,
  JOBS_COMPOSE_MIN_BUDGET_MS,
  JOBS_SLICE_BUDGET_MS,
  MAX_SEGMENT_ATTEMPTS,
  isLeaseStale,
  jobIsComposable,
  reduceSegmentConcurrency,
} from "@/lib/jobs";
import { classifyGeminiError } from "@/lib/gemini-errors";
import type {
  LectureJobRecord,
  LectureSegmentRecord,
  SegmentNotes,
  StructuredNotes,
  UserMemory,
  UserProfile,
} from "@/lib/types";
import { GeminiSpendCapError } from "@/lib/gemini-errors";
import { getActiveAlert, openAlert, markNotified, shouldNotifyAdmin } from "@/lib/alerts";
import { sendSpendCapAdminAlert } from "@/lib/admin-notify";
import { sendLectureReadyEmail } from "@/lib/lecture-notify";

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

  // Mark processing notes for the capacity overlay. Enriching jobs already
  // expose a readable note — leave that content untouched.
  if (job.note_id) {
    const { data: noteRow } = await db
      .from("notes")
      .select("content")
      .eq("id", job.note_id)
      .maybeSingle();
    const content = (noteRow?.content as StructuredNotes | null) ?? ({} as StructuredNotes);
    if (content.status !== "ready") {
      await db
        .from("notes")
        .update({ content: { ...content, status: "processing", hold: "gemini_spend_cap" } })
        .eq("id", job.note_id);
    }
  }
}

function configuredSecrets() {
  return [process.env.JOBS_TICK_SECRET, process.env.CRON_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
}

function isAuthorizedTick(request: Request) {
  const secrets = configuredSecrets();
  if (secrets.length === 0) return process.env.NODE_ENV !== "production";

  const headerSecret = request.headers.get("x-jobs-secret")?.trim();
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return secrets.some((secret) => secret === headerSecret || secret === bearer);
}

async function isJobCancelled(
  db: ReturnType<typeof createAdminClient>,
  jobId: string
): Promise<boolean> {
  const { data } = await db
    .from("lecture_jobs")
    .select("status, error")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "failed" || data?.error === "admin_stopped";
}

async function selfChain(request: Request) {
  const secret = configuredSecrets()[0];
  if (!secret) return;

  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, {
    method: "POST",
    headers: { "x-jobs-secret": secret },
  }).catch(() => {});
}

async function claimJob(
  db: ReturnType<typeof createAdminClient>,
  job: LectureJobRecord
): Promise<boolean> {
  const claimStamp = new Date().toISOString();
  let claimQuery = db
    .from("lecture_jobs")
    .update({ heartbeat_at: claimStamp, updated_at: claimStamp })
    .eq("id", job.id)
    .eq("status", job.status);
  claimQuery = job.heartbeat_at
    ? claimQuery.eq("heartbeat_at", job.heartbeat_at)
    : claimQuery.is("heartbeat_at", null);
  const { data: claimed } = await claimQuery.select("id").maybeSingle();
  return !!claimed;
}

async function runEnrichmentWorker(
  request: Request,
  job: LectureJobRecord,
  start: number
) {
  const db = createAdminClient();

  if (!(await claimJob(db, job))) {
    return NextResponse.json({ claimed: false, raced: true });
  }

  const [{ data: memoryRow }, { data: profileRow }, { data: noteRow }] = await Promise.all([
    db.from("user_memory").select("memory_blob").eq("user_id", job.user_id).maybeSingle(),
    db.from("user_profiles").select("*").eq("user_id", job.user_id).maybeSingle(),
    db.from("notes").select("content").eq("id", job.note_id).maybeSingle(),
  ]);

  const memoryContext =
    buildMemoryContext(
      (memoryRow?.memory_blob as UserMemory | undefined) ?? null,
      (profileRow as UserProfile | undefined) ?? null
    ) || undefined;

  const content = (noteRow?.content as StructuredNotes | null) ?? null;
  if (!content || content.enrichment !== "pending") {
    await db
      .from("lecture_jobs")
      .update({ status: "ready", heartbeat_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ claimed: true, enriched: false, skipped: true });
  }

  if (Date.now() - start > JOBS_SLICE_BUDGET_MS - JOBS_COMPOSE_MIN_BUDGET_MS) {
    await db
      .from("lecture_jobs")
      .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    await selfChain(request);
    return NextResponse.json({ claimed: true, yielded: true, beforeEnrich: true });
  }

  await db
    .from("lecture_jobs")
    .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
    .eq("id", job.id);

  try {
    const enriched = await enrichNoteWithResearch(content, memoryContext);
    await db
      .from("notes")
      .update({ content: enriched })
      .eq("id", job.note_id);
    await db
      .from("lecture_jobs")
      .update({ status: "ready", heartbeat_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({
      claimed: true,
      enriched: true,
      enrichment: enriched.enrichment ?? "complete",
    });
  } catch (err) {
    if (err instanceof GeminiSpendCapError) {
      await holdJobForSpendCap(db, job, null);
      return NextResponse.json({ claimed: true, held: "spend_cap" });
    }
    console.error("Research enrich failed:", err);
    await db
      .from("notes")
      .update({ content: { ...content, enrichment: "failed" } })
      .eq("id", job.note_id);
    await db
      .from("lecture_jobs")
      .update({ status: "ready", heartbeat_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ claimed: true, enriched: false });
  }
}

async function runWorker(request: Request) {
  const start = Date.now();
  if (!isAuthorizedTick(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const db = createAdminClient();

  // Don't touch Gemini while a spend-cap incident is open — every call would
  // just fail and burn money/retries. Resume happens when an admin resolves it.
  if (await getActiveAlert("GEMINI_SPEND_CAP")) {
    return NextResponse.json({ paused: "spend_cap" });
  }

  const now = Date.now();

  // 1) Prefer transcription/compose work over background enrichment.
  const { data: processingCandidates } = await db
    .from("lecture_jobs")
    .select("*")
    .in("status", ["recording_complete", "processing"])
    .order("created_at", { ascending: true })
    .limit(10);

  let jobCandidate = (processingCandidates as LectureJobRecord[] | null)?.find((j) =>
    isLeaseStale(j.heartbeat_at, now)
  );

  if (!jobCandidate) {
    const { data: enrichingCandidates } = await db
      .from("lecture_jobs")
      .select("*")
      .eq("status", "enriching")
      .order("created_at", { ascending: true })
      .limit(10);
    jobCandidate = (enrichingCandidates as LectureJobRecord[] | null)?.find((j) =>
      isLeaseStale(j.heartbeat_at, now)
    );
    if (jobCandidate) {
      return runEnrichmentWorker(request, jobCandidate, start);
    }
    return NextResponse.json({ claimed: false });
  }

  const job: LectureJobRecord = jobCandidate;

  // 2) Claim it: conditional update on the heartbeat we saw (optimistic lock).
  const claimStamp = new Date().toISOString();
  let claimQuery = db
    .from("lecture_jobs")
    .update({ status: "processing", heartbeat_at: claimStamp, updated_at: claimStamp })
    .eq("id", job.id)
    .eq("status", job.status);
  claimQuery = job.heartbeat_at
    ? claimQuery.eq("heartbeat_at", job.heartbeat_at)
    : claimQuery.is("heartbeat_at", null);
  const { data: claimed } = await claimQuery.select("id").maybeSingle();
  if (!claimed) return NextResponse.json({ claimed: false, raced: true });

  // Recover orphaned segments: a previous tick that died mid-transcription
  // leaves a segment stuck in "transcribing". We now exclusively own this job
  // (the lease above), so reset those back to "uploaded" to be retried. Without
  // this, a crash during one segment would hang the whole job forever.
  await db
    .from("lecture_segments")
    .update({ status: "uploaded", updated_at: new Date().toISOString() })
    .eq("job_id", job.id)
    .eq("status", "transcribing");

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

  type SegmentResult = "ok" | "spend_cap" | "failed" | "rate_limit";

  async function transcribeOneSegment(next: LectureSegmentRecord): Promise<SegmentResult> {
    await db
      .from("lecture_segments")
      .update({ status: "transcribing", updated_at: new Date().toISOString() })
      .eq("id", next.id);

    try {
      const { Body } = await r2.send(
        new GetObjectCommand({ Bucket: getR2Bucket(), Key: next.r2_key })
      );
      if (!Body) throw new Error("Empty R2 body.");
      const bytes = Buffer.from(await Body.transformToByteArray());
      const mime = mimeFromKey(next.r2_key);

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
      return "ok";
    } catch (err) {
      if (err instanceof GeminiSpendCapError) {
        await holdJobForSpendCap(db, job, next.id);
        return "spend_cap";
      }
      if (classifyGeminiError(err) === "rate_limit") {
        await db
          .from("lecture_segments")
          .update({ status: "uploaded", updated_at: new Date().toISOString() })
          .eq("id", next.id);
        console.warn(`Segment ${next.index} hit rate limit; will retry with lower concurrency.`);
        return "rate_limit";
      }
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
      return "failed";
    }
  }

  /** Run a batch, stepping down parallelism when Gemini returns 429. */
  async function transcribeBatchAdaptive(
    batch: LectureSegmentRecord[],
    concurrency: number
  ): Promise<{ results: SegmentResult[]; concurrency: number }> {
    let parallel = concurrency;
    let offset = 0;
    const results: SegmentResult[] = [];

    while (offset < batch.length) {
      const slice = batch.slice(offset, offset + parallel);
      const sliceResults = await Promise.all(slice.map((s) => transcribeOneSegment(s)));

      if (sliceResults.includes("spend_cap")) {
        return { results: sliceResults, concurrency: parallel };
      }
      if (sliceResults.includes("rate_limit")) {
        parallel = reduceSegmentConcurrency(parallel);
        await new Promise((r) => setTimeout(r, 2000));
        if (parallel < slice.length) continue;
      }

      results.push(...sliceResults);
      offset += slice.length;
    }

    return { results, concurrency: parallel };
  }

  let segmentConcurrency = JOBS_SEGMENT_CONCURRENCY;

  // 3) Transcribe segments (in parallel batches) until the slice budget is spent.
  for (;;) {
    if (await isJobCancelled(db, job.id)) {
      return NextResponse.json({ claimed: true, cancelled: true });
    }

    if (Date.now() - start > JOBS_SLICE_BUDGET_MS) {
      await db
        .from("lecture_jobs")
        .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
        .eq("id", job.id);
      await selfChain(request);
      return NextResponse.json({ claimed: true, yielded: true });
    }

    const { data: segRows } = await db
      .from("lecture_segments")
      .select("*")
      .eq("job_id", job.id)
      .order("index", { ascending: true });
    const segments = (segRows as LectureSegmentRecord[] | null) ?? [];

    const pending = segments
      .filter((s) => s.status === "uploaded")
      .sort((a, b) => a.index - b.index);
    if (pending.length > 0) {
      const batch = pending.slice(0, segmentConcurrency);
      await db
        .from("lecture_jobs")
        .update({ heartbeat_at: new Date().toISOString() })
        .eq("id", job.id);

      const { results, concurrency: nextConcurrency } = await transcribeBatchAdaptive(
        batch,
        segmentConcurrency
      );
      segmentConcurrency = nextConcurrency;
      if (results.includes("spend_cap")) {
        return NextResponse.json({ claimed: true, held: "spend_cap" });
      }
      continue;
    }

    // 4) No segment to transcribe. Compose if the job is ready; else yield.
    const { data: freshMeta } = await db
      .from("lecture_jobs")
      .select("status, segment_count, note_id, live_transcript, total_seconds")
      .eq("id", job.id)
      .maybeSingle();
    const composableStatus = (freshMeta?.status ?? job.status) as LectureJobRecord["status"];
    const composableCount = freshMeta?.segment_count ?? job.segment_count;

    if (jobIsComposable(composableStatus, composableCount, segments)) {
      if (Date.now() - start > JOBS_SLICE_BUDGET_MS - JOBS_COMPOSE_MIN_BUDGET_MS) {
        await db
          .from("lecture_jobs")
          .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
          .eq("id", job.id);
        await selfChain(request);
        return NextResponse.json({ claimed: true, yielded: true, beforeCompose: true });
      }

      const ordered = segments
        .filter((s) => s.partial_notes)
        .sort((a, b) => a.index - b.index)
        .map((s) => s.partial_notes as SegmentNotes);

      if (ordered.length === 0) {
        await db
          .from("notes")
          .update({
            title: "Processing failed",
            content: failedContent(
              "Atlas couldn't transcribe this recording. Please try again or upload the audio as a file."
            ),
          })
          .eq("id", job.note_id);
        await db
          .from("lecture_jobs")
          .update({ status: "failed", error: "transcribe", heartbeat_at: null })
          .eq("id", job.id);
        return NextResponse.json({ claimed: true, composed: false, transcribeFailed: true });
      }

      // Release the lease before a long compose so a Vercel timeout doesn't
      // block reclaim for the full lease window.
      await db
        .from("lecture_jobs")
        .update({ heartbeat_at: null, updated_at: new Date().toISOString() })
        .eq("id", job.id);

      const noteId = freshMeta?.note_id ?? job.note_id;
      const liveTranscript = freshMeta?.live_transcript ?? job.live_transcript;
      const totalSeconds = freshMeta?.total_seconds ?? job.total_seconds;

      try {
        const notes = await composeNotes({
          segments: ordered,
          memoryContext,
          skipResearch: true,
        });
        if (!notes.transcript?.trim() && liveTranscript?.trim()) {
          notes.transcript = liveTranscript.trim();
        }

        const queueEnrichment = shouldQueueResearchEnrichment();
        notes.enrichment = queueEnrichment ? "pending" : "skipped";

        await db
          .from("notes")
          .update({
            title: notes.title,
            subject: notes.subject || null,
            content: notes,
            duration_seconds: totalSeconds ?? null,
          })
          .eq("id", noteId);
        await db
          .from("lecture_jobs")
          .update({
            status: queueEnrichment ? "enriching" : "ready",
            heartbeat_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        const { data: userRes } = await db.auth.admin.getUserById(job.user_id);
        const email = userRes?.user?.email;
        if (email && job.note_id) {
          await sendLectureReadyEmail(email, {
            jobId: job.id,
            noteId: job.note_id,
            title: notes.title,
          });
        }

        await Promise.all(
          segments.map((segment) =>
            r2
              .send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: segment.r2_key }))
              .catch(() => {})
          )
        );

        if (queueEnrichment) await selfChain(request);
        return NextResponse.json({ claimed: true, composed: true, enriching: queueEnrichment });
      } catch (err) {
        if (err instanceof GeminiSpendCapError) {
          await holdJobForSpendCap(db, job, null);
          return NextResponse.json({ claimed: true, held: "spend_cap" });
        }
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

    // Segments still uploading, or recording not finished. Keep a short lease
    // instead of clearing it immediately; otherwise one incomplete/stalled job
    // can be re-claimed every tick and starve newer jobs that are ready.
    await db
      .from("lecture_jobs")
      .update({ heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", job.id);
    return NextResponse.json({ claimed: true, waiting: true });
  }
}

export async function GET(request: Request) {
  return runWorker(request);
}

export async function POST(request: Request) {
  return runWorker(request);
}
