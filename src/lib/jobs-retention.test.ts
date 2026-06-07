import { describe, expect, it } from "vitest";
import {
  STALE_JOB_TTL_MS,
  formatAutoDeleteCountdown,
  getJobAutoDeleteAtMs,
  getJobLastActivityMs,
  isIncompleteJobStatus,
  isJobStaleForCleanup,
} from "./jobs-retention";

describe("isIncompleteJobStatus", () => {
  it("treats open pipeline states as incomplete", () => {
    expect(isIncompleteJobStatus("recording")).toBe(true);
    expect(isIncompleteJobStatus("recording_complete")).toBe(true);
    expect(isIncompleteJobStatus("processing")).toBe(true);
  });

  it("treats terminal states as complete", () => {
    expect(isIncompleteJobStatus("ready")).toBe(false);
    expect(isIncompleteJobStatus("failed")).toBe(false);
  });
});

describe("getJobLastActivityMs", () => {
  it("uses the newest timestamp across job and segment activity", () => {
    const now = Date.parse("2026-06-07T12:00:00.000Z");
    const lastActivity = getJobLastActivityMs(
      {
        created_at: "2026-06-07T10:00:00.000Z",
        updated_at: "2026-06-07T10:30:00.000Z",
        heartbeat_at: "2026-06-07T11:00:00.000Z",
      },
      "2026-06-07T11:45:00.000Z",
      now
    );
    expect(lastActivity).toBe(Date.parse("2026-06-07T11:45:00.000Z"));
  });
});

describe("isJobStaleForCleanup", () => {
  it("marks a job stale once the TTL has elapsed", () => {
    const now = Date.parse("2026-06-07T12:00:00.000Z");
    const lastActivity = now - STALE_JOB_TTL_MS - 1;
    expect(isJobStaleForCleanup(lastActivity, now)).toBe(true);
  });

  it("keeps active jobs", () => {
    const now = Date.parse("2026-06-07T12:00:00.000Z");
    const lastActivity = now - STALE_JOB_TTL_MS + 60_000;
    expect(isJobStaleForCleanup(lastActivity, now)).toBe(false);
  });
});

describe("getJobAutoDeleteAtMs", () => {
  it("adds the TTL to the last activity timestamp", () => {
    const lastActivity = Date.parse("2026-06-07T10:00:00.000Z");
    expect(getJobAutoDeleteAtMs(lastActivity)).toBe(lastActivity + STALE_JOB_TTL_MS);
  });
});

describe("formatAutoDeleteCountdown", () => {
  it("shows pending cleanup once the deadline has passed", () => {
    expect(formatAutoDeleteCountdown(Date.now() - 1)).toBe("Pending cleanup");
  });

  it("formats hours and minutes", () => {
    const now = Date.parse("2026-06-07T12:00:00.000Z");
    expect(formatAutoDeleteCountdown(now + 2 * 3_600_000 + 15 * 60_000, now)).toBe(
      "2h 15m"
    );
  });
});
