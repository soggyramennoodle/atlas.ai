import "server-only";
import { parse, HTMLElement, NodeType, type Node } from "node-html-parser";

/** A run of text with inline formatting marks. */
export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * A single rendered line of an exported note body. The rich-text HTML is
 * flattened to this list so the PDF and DOCX exporters can each render it with
 * a simple, page-break-safe loop (no nested layout that can overlap).
 */
export interface ExportLine {
  type: "h2" | "h3" | "p" | "li";
  runs: InlineRun[];
  /** Indent depth for list items. */
  level: number;
  /** "•" for bullets, "1." etc. for ordered lists. */
  marker?: string;
}

function tagOf(node: Node): string {
  return node instanceof HTMLElement ? node.rawTagName?.toLowerCase() ?? "" : "";
}

/** Collect formatted text runs from a node, optionally skipping nested lists. */
function collectRuns(
  node: Node,
  marks: Omit<InlineRun, "text">,
  out: InlineRun[],
  skipLists = false
): void {
  for (const child of node.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      const text = child.text;
      if (text && text.trim()) out.push({ text, ...marks });
      continue;
    }
    if (!(child instanceof HTMLElement)) continue;
    const tag = tagOf(child);
    if (skipLists && (tag === "ul" || tag === "ol")) continue;
    if (tag === "br") {
      out.push({ text: "\n", ...marks });
      continue;
    }
    const next: Omit<InlineRun, "text"> = { ...marks };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "u") next.underline = true;
    collectRuns(child, next, out, skipLists);
  }
}

/** Merge adjacent runs with identical marks for cleaner output. */
function runsOf(node: Node, skipLists = false): InlineRun[] {
  const raw: InlineRun[] = [];
  collectRuns(node, {}, raw, skipLists);
  return raw;
}

function walkList(
  listEl: HTMLElement,
  lines: ExportLine[],
  level: number,
  ordered: boolean
): void {
  let n = 0;
  for (const li of listEl.childNodes) {
    if (!(li instanceof HTMLElement) || tagOf(li) !== "li") continue;
    n += 1;
    const runs = runsOf(li, true);
    const marker = ordered ? `${n}.` : "•";
    if (runs.length) lines.push({ type: "li", runs, level, marker });
    for (const child of li.childNodes) {
      const tag = tagOf(child);
      if (child instanceof HTMLElement && (tag === "ul" || tag === "ol")) {
        walkList(child, lines, level + 1, tag === "ol");
      }
    }
  }
}

function walkNodes(nodes: Node[], lines: ExportLine[]): void {
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    const tag = tagOf(node);
    switch (tag) {
      case "h1":
      case "h2": {
        const runs = runsOf(node);
        if (runs.length) lines.push({ type: "h2", runs, level: 0 });
        break;
      }
      case "h3":
      case "h4": {
        const runs = runsOf(node);
        if (runs.length) lines.push({ type: "h3", runs, level: 0 });
        break;
      }
      case "ul":
        walkList(node, lines, 0, false);
        break;
      case "ol":
        walkList(node, lines, 0, true);
        break;
      default: {
        const runs = runsOf(node);
        if (runs.length) lines.push({ type: "p", runs, level: 0 });
      }
    }
  }
}

/** Flatten note-body HTML into an ordered list of render-ready lines. */
export function htmlToExportLines(html: string): ExportLine[] {
  const root = parse(html, { lowerCaseTagName: true });
  const lines: ExportLine[] = [];
  walkNodes(root.childNodes, lines);
  return lines;
}
