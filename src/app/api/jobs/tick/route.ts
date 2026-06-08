import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getR2Bucket, r2 } from "@/lib/r2";
import { composeNotes, transcribeSegment } from "@/lib/gemini";
import { mimeFromKey } from "@/lib/upload-lecture";
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

async function selfChain(request: Request) {
  const secret = configuredSecrets()[0];
  if (!secret) return;

  const url = new URL("/api/jobs/tick", request.url).toString();
  fetch(url, {
    method: "POST",
    headers: { "x-jobs-secret": secret },
  }).catch(() => {});
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
  let claimQuery = db
    .from("lecture_jobs")
    .update({ status: "processing", heartbeat_at: claimStamp, updated_at: claimStamp })
    .eq("id", job.id)
    .eq("status", job.status);
  // Only claim if the heartbeat is still what we read.
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
      } catch (err) {
        if (err instanceof GeminiSpendCapError) {
          await holdJobForSpendCap(db, job, next.id);
          return NextResponse.json({ claimed: true, held: "spend_cap" });
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
      }
      continue;
    }

    // 4) No segment to transcribe. Compose if the job is ready; else yield.
    if (jobIsComposable(job.status, job.segment_count, segments)) {
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
        return NextResponse.json({ claimed: true, composed: true });
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
