"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The shared Atlas AI glow (§4): soft, liquid color blobs drifting on long,
 * mismatched loops so the motion never visibly repeats. Used by the summary
 * box, the key-concept AI panels and the recording aura for one cohesive brand
 * palette.
 *
 * Performance: every blob animates with CSS keyframes that touch only transform
 * and opacity, and each is promoted to its own compositor layer — so the blur
 * is rasterized once and merely composited. The animation also pauses itself
 * via IntersectionObserver when scrolled out of view, keeping note scrolling at
 * 60fps regardless of how many glows are mounted.
 */

// The exclusive AI palette.
const PALETTE = {
  indigo: "#6C63FF",
  blue: "#4FC3F7",
  amber: "#FFB347",
  lavender: "#B39DDB",
} as const;

interface BlobSpec {
  color: string;
  size: string;
  top: string;
  left: string;
  anim: "a" | "b" | "c" | "d" | "e";
  /** Base loop duration in seconds (idle). */
  dur: number;
}

const BLOBS: BlobSpec[] = [
  { color: PALETTE.indigo, size: "72%", top: "-12%", left: "-8%", anim: "a", dur: 19 },
  { color: PALETTE.blue, size: "60%", top: "8%", left: "46%", anim: "b", dur: 23 },
  { color: PALETTE.amber, size: "56%", top: "44%", left: "2%", anim: "c", dur: 29 },
  { color: PALETTE.lavender, size: "64%", top: "26%", left: "34%", anim: "d", dur: 17 },
  { color: PALETTE.indigo, size: "46%", top: "52%", left: "56%", anim: "e", dur: 31 },
];

export function AiGlow({
  mode = "idle",
  blend = false,
  blur = 48,
  className,
}: {
  /** "idle" = slow ambient drift; "active" = faster, brighter thinking pulse. */
  mode?: "idle" | "active";
  /** Screen-blend the blobs for the most vivid (recording) treatment. */
  blend?: boolean;
  /** Blur radius in px. Larger = softer / more diffuse. */
  blur?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Pause the CSS animations entirely while off-screen — no wasted compositing.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.paused = entry.isIntersecting ? "false" : "true";
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const speed = mode === "active" ? 0.55 : 1;

  return (
    <div
      ref={ref}
      aria-hidden
      data-paused="false"
      className={cn(
        "ai-glow transition-opacity duration-700",
        blend && "ai-glow--blend",
        mode === "active" ? "opacity-95" : "opacity-70",
        className
      )}
    >
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className="ai-blob"
          style={{
            width: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(closest-side, ${b.color}, transparent 72%)`,
            filter: `blur(${blur}px)`,
            animationName: `atlas-glow-${b.anim}`,
            animationDuration: `${(b.dur * speed).toFixed(1)}s`,
            animationDelay: `${(i * -3.1).toFixed(1)}s`,
          }}
        />
      ))}
    </div>
  );
}
