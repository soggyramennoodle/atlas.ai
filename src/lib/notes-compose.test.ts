import { describe, expect, it } from "vitest";
import {
  countNotePoints,
  mergeSegmentNotes,
  dedupeKeyConcepts,
  joinTranscripts,
  preserveMergedPoints,
} from "./notes-compose";
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

describe("preserveMergedPoints", () => {
  it("restores segment sections when compose drops bullets", () => {
    const merged = mergeSegmentNotes([a, b]);
    const composed = {
      sections: [{ heading: "Summary only", points: [{ text: "one bullet" }] }],
      keyConcepts: [] as typeof merged.keyConcepts,
    };
    const out = preserveMergedPoints(composed, merged);
    expect(countNotePoints(out.sections)).toBe(countNotePoints(merged.sections));
    expect(out.keyConcepts).toEqual(merged.keyConcepts);
  });

  it("keeps composed sections when nothing was dropped", () => {
    const merged = mergeSegmentNotes([a, b]);
    const composed = {
      sections: merged.sections,
      keyConcepts: merged.keyConcepts,
    };
    const out = preserveMergedPoints(composed, merged);
    expect(out.sections).toEqual(merged.sections);
  });
});
