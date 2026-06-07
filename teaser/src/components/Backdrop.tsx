import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { atlas } from "../theme";

/**
 * The shared spatial canvas. Light mode = clean white with three soft drifting
 * aurora blooms of the AI palette (mirrors .bg-aurora / .spatial-bloom). Dark
 * mode = the near-black icon canvas with the same blooms, deeper. A faint grain
 * sits on top to kill flat digital gradients.
 */
export const Backdrop: React.FC<{ mode?: "light" | "dark"; drift?: boolean }> = ({
  mode = "light",
  drift = true,
}) => {
  const frame = useCurrentFrame();
  const t = drift ? frame : 0;
  const base = mode === "light" ? atlas.bg : atlas.night;

  const bloom = (
    key: string,
    x: number,
    y: number,
    color: string,
    size: number,
    strength: number,
    phase: number
  ) => {
    const dx = Math.sin((t + phase) / 90) * 22;
    const dy = Math.cos((t + phase) / 110) * 18;
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
          borderRadius: "9999px",
          background: `radial-gradient(circle at 50% 50%, ${color}, transparent 68%)`,
          opacity: strength,
          filter: "blur(70px)",
        }}
      />
    );
  };

  const a = atlas.aiGradient;
  return (
    <AbsoluteFill style={{ backgroundColor: base, overflow: "hidden" }}>
      {bloom("a", 82, -6, a[0], 760, mode === "light" ? 0.22 : 0.34, 0)}
      {bloom("b", 6, 4, a[1], 640, mode === "light" ? 0.16 : 0.26, 120)}
      {bloom("c", 26, 108, a[2], 600, mode === "light" ? 0.13 : 0.22, 240)}
      {/* Architectural blueprint grid — faint atelier guides, edge-masked. */}
      <AbsoluteFill
        style={{
          opacity: mode === "light" ? 0.05 : 0.07,
          backgroundImage: `linear-gradient(to right, ${atlas.ink}22 1px, transparent 1px), linear-gradient(to bottom, ${atlas.ink}22 1px, transparent 1px)`,
          backgroundSize: "76px 76px",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 35%, transparent 80%)",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 35%, transparent 80%)",
        }}
      />
      {/* Vignette to seat the composition. */}
      <AbsoluteFill
        style={{
          boxShadow:
            mode === "light"
              ? "inset 0 0 320px 80px rgba(0,0,0,0.05)"
              : "inset 0 0 360px 90px rgba(0,0,0,0.55)",
          background: "transparent",
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};

/** Lightweight film-grain overlay (procedural, deterministic per frame). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.035 }) => {
  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: "none",
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "160px 160px",
      }}
    />
  );
};
