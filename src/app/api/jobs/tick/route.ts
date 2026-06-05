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
  fetch(url, {
    method: "POST",
    headers: { "x-jobs-secret": process.env.JOBS_TICK_SECRET ?? "" },
  }).catch(() => {});
}

export async function POST(request: Request) {
  const start = Date.now();
  if (
    (request.headers.get("x-jobs-secret") ?? "") !==
    (process.env.JOBS_TICK_SECRET ?? "__unset__")
  ) {
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
      continue;
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
