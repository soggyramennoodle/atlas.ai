import { describe, it, expect } from "vitest";
import {
  buildMemoryContext,
  mergeMemory,
  normalizeCourses,
  normalizeMemory,
  courseLabel,
} from "./memory";
import type { UserMemory } from "./types";

describe("courseLabel", () => {
  it("joins code and name, falling back to whichever exists", () => {
    expect(courseLabel({ code: "BIO 101", name: "Biology" })).toBe(
      "BIO 101 — Biology"
    );
    expect(courseLabel({ name: "Biology" })).toBe("Biology");
    expect(courseLabel({ code: "BIO 101", name: "" })).toBe("BIO 101");
  });
});

describe("normalizeCourses", () => {
  it("de-dupes by code, preserving a code across duplicates", () => {
    const out = normalizeCourses([
      { name: "Biology" },
      { code: "BIO 101", name: "Intro Biology" },
      { code: "bio 101", name: "Biology I" },
    ]);
    // The two BIO 101 entries collapse; the nameless-name one stays distinct.
    const codes = out.filter((c) => c.code);
    expect(codes).toHaveLength(1);
    expect(codes[0].code).toBe("bio 101");
  });

  it("drops entries with neither code nor name", () => {
    expect(normalizeCourses([{ name: "  " }, { name: "Chem" }])).toEqual([
      { name: "Chem" },
    ]);
  });
});

describe("mergeMemory", () => {
  it("appends a correction with a timestamp and note title", () => {
    const merged = mergeMemory(
      {},
      { correctionSummary: "Wants worked examples", noteTitle: "Limits" }
    );
    expect(merged.corrections).toHaveLength(1);
    expect(merged.corrections![0].summary).toBe("Wants worked examples");
    expect(merged.corrections![0].noteTitle).toBe("Limits");
    expect(merged.corrections![0].at).toBeTruthy();
  });

  it("keeps content and formatting preferences in separate buckets", () => {
    const merged = mergeMemory(
      {},
      {
        contentPreferences: ["wants derivations shown"],
        formattingPreferences: ["plain text over markdown"],
        correctionSummary: "",
      }
    );
    expect(merged.contentPreferences).toEqual(["wants derivations shown"]);
    expect(merged.formattingPreferences).toEqual(["plain text over markdown"]);
  });

  it("merges and de-dupes courses by code", () => {
    const merged = mergeMemory(
      { courses: [{ code: "BIO 101", name: "Biology" }] },
      { courses: [{ code: "BIO 101", name: "Intro Biology" }], correctionSummary: "" }
    );
    expect(merged.courses).toHaveLength(1);
  });

  it("caps correction history at 40", () => {
    let mem: UserMemory = {};
    for (let i = 0; i < 50; i++) {
      mem = mergeMemory(mem, { correctionSummary: `c${i}` });
    }
    expect(mem.corrections).toHaveLength(40);
    expect(mem.corrections![39].summary).toBe("c49");
  });
});

describe("normalizeMemory", () => {
  it("caps and de-dupes while preserving base correction history", () => {
    const base: UserMemory = {
      corrections: [{ at: "2026-01-01T00:00:00Z", summary: "kept" }],
    };
    const out = normalizeMemory(
      {
        subjects: ["Biology", "biology", "Chemistry"],
        recurringConcepts: ["mitosis", "mitosis"],
      },
      base
    );
    expect(out.subjects).toEqual(["Biology", "Chemistry"]);
    expect(out.recurringConcepts).toEqual(["mitosis"]);
    expect(out.corrections).toEqual(base.corrections);
  });
});

describe("buildMemoryContext", () => {
  it("surfaces courses with codes and keeps formatting clearly separate", () => {
    const ctx = buildMemoryContext(
      {
        courses: [{ code: "BIO 101", name: "Biology" }],
        contentPreferences: ["wants worked examples"],
        formattingPreferences: ["plain text over markdown"],
      },
      null
    );
    expect(ctx).toContain("BIO 101 — Biology");
    expect(ctx).toContain("wants worked examples");
    expect(ctx).toMatch(/formatting preferences \(presentation only/i);
  });

  it("treats legacy stylePreferences as formatting, not learning signal", () => {
    const ctx = buildMemoryContext(
      { stylePreferences: ["increased line spacing"] },
      null
    );
    expect(ctx).toMatch(/formatting preferences/i);
    expect(ctx).toContain("increased line spacing");
  });

  it("returns an empty string when there is nothing to say", () => {
    expect(buildMemoryContext({}, null)).toBe("");
    expect(buildMemoryContext(null, null)).toBe("");
  });
});
