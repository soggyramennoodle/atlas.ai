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
  it("needs recording_complete/processing, a known count, and all segments resolved", () => {
    const segs = [seg(0, "transcribed"), seg(1, "transcribed")];
    expect(jobIsComposable("recording_complete", 2, segs)).toBe(true);
    expect(jobIsComposable("processing", 2, segs)).toBe(true);
    expect(jobIsComposable("recording_complete", 3, segs)).toBe(false);
  });
});
