import { describe, expect, it } from "vitest";
import {
  notesBodyToHtml,
  parseNoteBullets,
  replaceLineWithAiHtml,
  seedBodyFromSections,
} from "./notes-html";
import type { StructuredNotes } from "./types";

function makeNotes(sections: StructuredNotes["sections"]): StructuredNotes {
  return { title: "T", summary: "", sections, keyConcepts: [] };
}

describe("parseNoteBullets", () => {
  it("splits one bullet per line", () => {
    expect(parseNoteBullets("First idea\nSecond idea")).toEqual([
      "First idea",
      "Second idea",
    ]);
  });

  it("strips stray list markers and collapses whitespace", () => {
    expect(parseNoteBullets("- a   b\n* c\n1. d\n• e")).toEqual([
      "a b",
      "c",
      "d",
      "e",
    ]);
  });

  it("ignores blank lines", () => {
    expect(parseNoteBullets("\n\nonly\n\n")).toEqual(["only"]);
  });
});

describe("replaceLineWithAiHtml", () => {
  it("replaces the matching list item with Atlas-tagged bullet(s)", () => {
    const { html, matched, removedSourceIndex } = replaceLineWithAiHtml(
      "<ul><li>Alpha</li><li>Beta</li></ul>",
      "Alpha",
      ["Richer alpha"]
    );
    expect(matched).toBe(true);
    expect(removedSourceIndex).toBe(0);
    expect(html).toBe(
      '<ul><li data-atlas-ai="1">Richer alpha</li><li>Beta</li></ul>'
    );
  });

  it("expands one line into multiple bullets in place", () => {
    const { html } = replaceLineWithAiHtml(
      "<ul><li>One</li><li>Two</li><li>Three</li></ul>",
      "Two",
      ["Two-a", "Two-b"]
    );
    const items = html.match(/<li[^>]*>([^<]*)<\/li>/g) ?? [];
    expect(items).toEqual([
      "<li>One</li>",
      '<li data-atlas-ai="1">Two-a</li>',
      '<li data-atlas-ai="1">Two-b</li>',
      "<li>Three</li>",
    ]);
  });

  it("reports the lecture-source index counting only non-AI items before it", () => {
    // First item is already AI-added; the real lecture line "Beta" sits at
    // lecture-source index 0 (AI items don't consume a source slot).
    const { removedSourceIndex } = replaceLineWithAiHtml(
      '<ul><li data-atlas-ai="1">added</li><li>Beta</li><li>Gamma</li></ul>',
      "Beta",
      ["Beta+"]
    );
    expect(removedSourceIndex).toBe(0);
  });

  it("returns a null source index when replacing a paragraph (not a list item)", () => {
    const { html, removedSourceIndex } = replaceLineWithAiHtml(
      "<p>A standalone line.</p>",
      "A standalone line.",
      ["Deeper version"]
    );
    expect(removedSourceIndex).toBeNull();
    expect(html).toBe('<ul><li data-atlas-ai="1">Deeper version</li></ul>');
  });

  it("matches tolerantly on normalized whitespace/case", () => {
    const { html, matched } = replaceLineWithAiHtml(
      "<ul><li>The  Krebs   Cycle</li></ul>",
      "the krebs cycle",
      ["note"]
    );
    expect(matched).toBe(true);
    expect(html).toBe('<ul><li data-atlas-ai="1">note</li></ul>');
  });

  it("appends and reports no match when the line is missing", () => {
    const { html, matched, removedSourceIndex } = replaceLineWithAiHtml(
      "<ul><li>Only line</li></ul>",
      "Nonexistent line",
      ["orphan"]
    );
    expect(matched).toBe(false);
    expect(removedSourceIndex).toBeNull();
    expect(html).toBe(
      '<ul><li>Only line</li></ul><ul><li data-atlas-ai="1">orphan</li></ul>'
    );
  });

  it("escapes HTML in inserted content", () => {
    const { html } = replaceLineWithAiHtml("<ul><li>x</li></ul>", "x", [
      "a < b & c > d",
    ]);
    expect(html).toBe('<ul><li data-atlas-ai="1">a &lt; b &amp; c &gt; d</li></ul>');
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
