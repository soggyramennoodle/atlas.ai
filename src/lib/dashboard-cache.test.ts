import { afterEach, describe, expect, it } from "vitest";
import { consumeDashboardStale, markDashboardStale } from "@/lib/dashboard-cache";

describe("dashboard-cache", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("marks and consumes a stale flag once", () => {
    markDashboardStale();
    expect(consumeDashboardStale()).toBe(true);
    expect(consumeDashboardStale()).toBe(false);
  });
});
