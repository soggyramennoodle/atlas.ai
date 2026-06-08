import { describe, expect, it } from "vitest";
import {
  insertAiBlockHtml,
  notesBodyToHtml,
  seedBodyFromSections,
  splitToNoteItems,
} from "./notes-html";
import type { StructuredNotes } from "./types";

function makeNotes(sections: StructuredNotes["sections"]): StructuredNotes {
  return { title: "T", summary: "", sections, keyConcepts: [] };
}

describe("splitToNoteItems", () => {
  it("keeps a single paragraph as one bullet", () => {
    expect(splitToNoteItems("Mitochondria make ATP.")).toEqual([
      "Mitochondria make ATP.",
    ]);
  });

  it("splits double-newline paragraphs into separate bullets", () => {
    expect(splitToNoteItems("First idea.\n\nSecond idea.")).toEqual([
      "First idea.",
      "Second idea.",
    ]);
  });

  it("collapses internal whitespace and drops empties", () => {
    expect(splitToNoteItems("  a   b \n\n\n  \n\n c ")).toEqual(["a b", "c"]);
  });
});

describe("insertAiBlockHtml", () => {
  it("inserts an Atlas-tagged bullet right after the matching list item", () => {
    const { html, matched } = insertAiBlockHtml(
      "<ul><li>Alpha</li><li>Beta</li></ul>",
      "Alpha",
      ["Extra detail"]
    );
    expect(matched).toBe(true);
    expect(html).toBe(
      '<ul><li>Alpha</li><li data-atlas-ai="1">Extra detail</li><li>Beta</li></ul>'
    );
  });

  it("preserves the order and text of existing items (source-index stability)", () => {
    const { html } = insertAiBlockHtml(
      "<ul><li>One</li><li>Two</li><li>Three</li></ul>",
      "Two",
      ["Added"]
    );
    // The three original items remain in order; the AI item sits between 2 and 3.
    const items = html.match(/<li[^>]*>([^<]*)<\/li>/g) ?? [];
    expect(items).toEqual([
      "<li>One</li>",
      "<li>Two</li>",
      '<li data-atlas-ai="1">Added</li>',
      "<li>Three</li>",
    ]);
  });

  it("wraps bullets in their own list when inserting after a paragraph", () => {
    const { html } = insertAiBlockHtml(
      "<p>A standalone line.</p>",
      "A standalone line.",
      ["Deeper context"]
    );
    expect(html).toBe(
      '<p>A standalone line.</p><ul><li data-atlas-ai="1">Deeper context</li></ul>'
    );
  });

  it("emits multiple bullets for a multi-item answer", () => {
    const { html } = insertAiBlockHtml("<ul><li>Root</li></ul>", "Root", [
      "First",
      "Second",
    ]);
    expect(html).toBe(
      '<ul><li>Root</li><li data-atlas-ai="1">First</li><li data-atlas-ai="1">Second</li></ul>'
    );
  });

  it("matches tolerantly on normalized whitespace/case", () => {
    const { html, matched } = insertAiBlockHtml(
      "<ul><li>The  Krebs   Cycle</li></ul>",
      "the krebs cycle",
      ["note"]
    );
    expect(matched).toBe(true);
    expect(html).toContain('<li data-atlas-ai="1">note</li>');
  });

  it("appends at the end and reports no match when the line is missing", () => {
    const { html, matched } = insertAiBlockHtml(
      "<ul><li>Only line</li></ul>",
      "Nonexistent line",
      ["orphan"]
    );
    expect(matched).toBe(false);
    expect(html).toBe(
      '<ul><li>Only line</li></ul><ul><li data-atlas-ai="1">orphan</li></ul>'
    );
  });

  it("escapes HTML in inserted content", () => {
    const { html } = insertAiBlockHtml("<ul><li>x</li></ul>", "x", [
      "a < b & c > d",
    ]);
    expect(html).toContain(
      '<li data-atlas-ai="1">a &lt; b &amp; c &gt; d</li>'
    );
  });
});

describe("seedBodyFromSections", () => {
  it("produces the same bodyHtml as notesBodyToHtml", () => {
    const notes = makeNotes([
      { heading: "S1", points: [{ text: "p1" }, { text: "p2" }] },
    ]);
    const { bodyHtml } = seedBodyFromSections(notes);
    expect(bodyHtml).toBe(notesBodyToHtml(notes));
  });

  it("aligns source indices with li order, skipping empty points but still consuming index slots", () => {
    const notes = makeNotes([
      {
        heading: "S1",
        points: [
          { text: "p1", source_excerpt: "e1" },
          { text: "p2" }, // no excerpt: consumes index 1, no source entry
          { text: "   " }, // empty: not rendered, not indexed
        ],
        subsections: [
          { heading: "Sub", points: [{ text: "p3", source_excerpt: "e3" }] },
        ],
      },
    ]);

    const { bodySources } = seedBodyFromSections(notes);
    expect(bodySources).toEqual([
      { index: 0, text: "p1", status: "lecture", source_excerpt: "e1" },
      { index: 2, text: "p3", status: "lecture", source_excerpt: "e3" },
    ]);
  });

  it("returns an empty source map when no points carry excerpts", () => {
    const notes = makeNotes([
      { heading: "S1", points: [{ text: "p1" }, { text: "p2" }] },
    ]);
    expect(seedBodyFromSections(notes).bodySources).toEqual([]);
  });
});
