import { describe, expect, it } from "vitest";
import {
  PROCESSING_DONE_RETENTION_MS,
  deriveStage,
  emptyTally,
  isVisibleJob,
  tallySegments,
  type ProcessingJobView,
  type SegmentTally,
} from "./processing-status";

const NOW = Date.parse("2026-06-07T12:00:00.000Z");

function job(
  overrides: Partial<Omit<ProcessingJobView, "segments">> & {
    segments?: Partial<SegmentTally>;
  }
): ProcessingJobView {
  const { segments, ...rest } = overrides;
  return {
    jobId: "j",
    noteId: null,
    status: "processing",
    source: "microphone",
    segmentCount: null,
    totalSeconds: null,
    attempts: 0,
    heartbeatAt: new Date(NOW).toISOString(),
    error: null,
    createdAt: new Date(NOW - 60_000).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    ...rest,
    segments: { ...emptyTally(), ...segments },
  };
}

describe("tallySegments", () => {
  it("groups statuses and totals them", () => {
    const t = tallySegments([
      "uploaded",
      "uploaded",
      "transcribing",
      "transcribed",
      "failed",
    ]);
    expect(t).toEqual({
      total: 5,
      uploaded: 2,
      transcribing: 1,
      transcribed: 1,
      failed: 1,
    });
  });
});

describe("deriveStage", () => {
  it("shows Recording before any segment uploads", () => {
    const s = deriveStage(job({ status: "recording" }), { now: NOW });
    expect(s.key).toBe("recording");
  });

  it("shows Uploading once segments start arriving", () => {
    const s = deriveStage(
      job({ status: "recording", segments: { total: 3, uploaded: 3 } }),
      { now: NOW }
    );
    expect(s.key).toBe("uploading");
    expect(s.label).toContain("3");
  });

  it("queues a recording_complete job", () => {
    const s = deriveStage(job({ status: "recording_complete" }), { now: NOW });
    expect(s.key).toBe("queued");
  });

  it("reports transcription progress while a segment is in flight", () => {
    const s = deriveStage(
      job({
        status: "processing",
        segmentCount: 4,
        segments: { total: 4, transcribing: 1, transcribed: 2, uploaded: 1 },
      }),
      { now: NOW }
    );
    expect(s.key).toBe("transcribing");
    expect(s.progress).toBeCloseTo(0.5);
    expect(s.label).toContain("3/4");
  });

  it("composes once every segment is transcribed", () => {
    const s = deriveStage(
      job({
        status: "processing",
        segmentCount: 3,
        segments: { total: 3, transcribed: 3 },
      }),
      { now: NOW }
    );
    expect(s.key).toBe("composing");
  });

  it("marks a job stalled when its lease is stale", () => {
    const s = deriveStage(
      job({
        status: "processing",
        segmentCount: 3,
        heartbeatAt: new Date(NOW - 5 * 60_000).toISOString(),
        segments: { total: 3, transcribed: 1, uploaded: 2 },
      }),
      { now: NOW, leaseMs: 90_000 }
    );
    expect(s.key).toBe("stalled");
  });

  it("surfaces the error string on failure", () => {
    const s = deriveStage(
      job({ status: "failed", error: "compose" }),
      { now: NOW }
    );
    expect(s.key).toBe("failed");
    expect(s.label).toContain("compose");
  });
});

describe("isVisibleJob", () => {
  it("always shows active jobs", () => {
    expect(
      isVisibleJob({ status: "processing", updatedAt: new Date(0).toISOString() }, NOW)
    ).toBe(true);
  });

  it("keeps a just-finished job", () => {
    expect(
      isVisibleJob(
        { status: "ready", updatedAt: new Date(NOW - 60_000).toISOString() },
        NOW
      )
    ).toBe(true);
  });

  it("drops a finished job past the retention window", () => {
    expect(
      isVisibleJob(
        {
          status: "ready",
          updatedAt: new Date(NOW - PROCESSING_DONE_RETENTION_MS - 1).toISOString(),
        },
        NOW
      )
    ).toBe(false);
  });
});
