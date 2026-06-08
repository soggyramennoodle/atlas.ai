import { describe, expect, it } from "vitest";
import {
  deriveMethods,
  formatUserDate,
  isBannedUntil,
  methodLabel,
  tallyByUserId,
} from "@/lib/admin-users";

describe("deriveMethods", () => {
  it("reads providers from identities first", () => {
    expect(
      deriveMethods(
        [{ provider: "email" }, { provider: "google" }],
        { provider: "email", providers: ["email"] }
      )
    ).toEqual(["email", "google"]);
  });

  it("dedupes repeated providers", () => {
    expect(deriveMethods([{ provider: "google" }, { provider: "google" }], null)).toEqual([
      "google",
    ]);
  });

  it("falls back to app_metadata when identities are empty", () => {
    expect(deriveMethods([], { provider: "google", providers: ["google"] })).toEqual([
      "google",
    ]);
    expect(deriveMethods(null, { provider: "email", providers: null })).toEqual(["email"]);
  });

  it("returns empty when nothing is known", () => {
    expect(deriveMethods(null, null)).toEqual([]);
  });
});

describe("methodLabel", () => {
  it("maps known providers to friendly labels", () => {
    expect(methodLabel(["email"])).toBe("Email (magic link)");
    expect(methodLabel(["google"])).toBe("Google");
  });

  it("joins multiple providers", () => {
    expect(methodLabel(["email", "google"])).toBe("Email (magic link) + Google");
  });

  it("passes through unknown providers and handles empty", () => {
    expect(methodLabel(["github"])).toBe("github");
    expect(methodLabel([])).toBe("Unknown");
  });
});

describe("isBannedUntil", () => {
  const now = Date.parse("2026-06-07T00:00:00Z");

  it("is true for a future ban", () => {
    expect(isBannedUntil("2026-06-08T00:00:00Z", now)).toBe(true);
  });

  it("is false for a past/expired ban or none", () => {
    expect(isBannedUntil("2026-06-06T00:00:00Z", now)).toBe(false);
    expect(isBannedUntil(null, now)).toBe(false);
    expect(isBannedUntil(undefined, now)).toBe(false);
  });

  it("is false for the GoTrue 'none' sentinel and garbage", () => {
    expect(isBannedUntil("none", now)).toBe(false);
    expect(isBannedUntil("not-a-date", now)).toBe(false);
  });
});

describe("formatUserDate", () => {
  it("formats a valid ISO date", () => {
    expect(formatUserDate("2026-06-03T12:00:00Z")).toMatch(/2026/);
  });

  it("returns a dash for missing/invalid input", () => {
    expect(formatUserDate(null)).toBe("—");
    expect(formatUserDate("nonsense")).toBe("—");
  });
});

describe("tallyByUserId", () => {
  it("counts rows per user id", () => {
    const counts = tallyByUserId([
      { user_id: "a" },
      { user_id: "a" },
      { user_id: "b" },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });

  it("handles an empty list", () => {
    expect(tallyByUserId([]).size).toBe(0);
  });
});
