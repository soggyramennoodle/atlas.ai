import { describe, expect, it } from "vitest";
import { insertAiBlockHtml, splitToNoteItems } from "./notes-html";

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
