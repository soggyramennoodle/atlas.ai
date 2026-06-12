"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * LaTeX-aware text renderer. Gemini writes math wrapped in $...$ (inline) or
 * $$...$$ (display); this splits a plain-text run on those delimiters and
 * renders the math segments with KaTeX, leaving everything else untouched.
 * Plain strings (and older Unicode-math notes) pass through unchanged, so it
 * is safe on every text path.
 *
 * Heuristics: inline $...$ must not begin/end with whitespace and must not
 * contain another $, so currency like "$5 and $10" never parses as math.
 * Escaped \$ is restored as a literal dollar sign.
 */

const MATH_SPLIT =
  /(\$\$[\s\S]+?\$\$|\$(?!\s)(?:\\.|[^$\\\n])+?(?<![\s\\])\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/;

/** Cheap pre-check so non-math text skips the split + memo machinery. */
export function mightHaveMath(text: string): boolean {
  return text.includes("$") || text.includes("\\(") || text.includes("\\[");
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: "htmlAndMathml",
    });
  } catch {
    return "";
  }
}

function segment(text: string): React.ReactNode[] {
  const parts = text.split(MATH_SPLIT);
  return parts.map((part, i) => {
    let tex: string | null = null;
    let display = false;
    if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
      tex = part.slice(2, -2);
      display = true;
    } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
      tex = part.slice(2, -2);
      display = true;
    } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
      tex = part.slice(2, -2);
    } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      tex = part.slice(1, -1);
    }

    if (tex != null) {
      const html = renderKatex(tex.trim(), display);
      if (html) {
        return (
          <span
            key={i}
            className={display ? "my-2 block overflow-x-auto" : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      // KaTeX choked — show the raw TeX rather than nothing.
      return part;
    }
    // Restore escaped dollars in plain text.
    return part.includes("\\$") ? part.replaceAll("\\$", "$") : part;
  });
}

export function MathText({ text }: { text: string }) {
  const nodes = useMemo(
    () => (mightHaveMath(text) ? segment(text) : text),
    [text]
  );
  return <>{nodes}</>;
}
