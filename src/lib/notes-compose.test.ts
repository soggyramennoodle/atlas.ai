import { describe, expect, it } from "vitest";
import { mergeSegmentNotes, dedupeKeyConcepts, joinTranscripts } from "./notes-compose";
import type { SegmentNotes } from "./types";

const a: SegmentNotes = {
  transcript: "Part one.",
  sections: [{ heading: "Intro", points: [{ text: "p1" }] }],
  keyConcepts: [{ term: "Entropy", definition: "disorder" }],
};
const b: SegmentNotes = {
  transcript: "Part two.",
  sections: [{ heading: "Body", points: [{ text: "p2" }] }],
  keyConcepts: [
    { term: "entropy", definition: "dup, dropped" },
    { term: "Enthalpy", definition: "heat" },
  ],
};

describe("joinTranscripts", () => {
  it("joins in order with a single space", () => {
    expect(joinTranscripts([a, b])).toBe("Part one. Part two.");
  });
  it("skips empty transcripts", () => {
    expect(joinTranscripts([{ ...a, transcript: "" }, b])).toBe("Part two.");
  });
});

describe("dedupeKeyConcepts", () => {
  it("dedupes case-insensitively, first definition wins", () => {
    const out = dedupeKeyConcepts([...a.keyConcepts, ...b.keyConcepts]);
    expect(out).toEqual([
      { term: "Entropy", definition: "disorder" },
      { term: "Enthalpy", definition: "heat" },
    ]);
  });
});

describe("mergeSegmentNotes", () => {
  it("concatenates sections in segment order", () => {
    const merged = mergeSegmentNotes([a, b]);
    expect(merged.sections.map((s) => s.heading)).toEqual(["Intro", "Body"]);
    expect(merged.keyConcepts).toHaveLength(2);
    expect(merged.transcript).toBe("Part one. Part two.");
  });
});
