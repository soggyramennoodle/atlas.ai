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
