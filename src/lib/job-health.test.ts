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
