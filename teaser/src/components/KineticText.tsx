import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { aiGradientCss } from "../theme";
import { EASE_OUT } from "../anim";

// Deterministic pseudo-random so scramble glyphs are stable per (frame, index).
const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

type Common = {
  delay?: number;
  color?: string;
  fontFamily: string;
  fontSize: number;
  weight?: number;
  letterSpacing?: string;
  gradient?: boolean;
  style?: React.CSSProperties;
};

/**
 * Words unfold into place in 3D — each one hinges down from a top edge
 * (rotateX), de-blurs and seats with a spring, staggered. Not a fade; a fold.
 */
export const KineticWords: React.FC<Common & { text: string; stagger?: number }> = ({
  text,
  delay = 0,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 700,
  letterSpacing = "-0.02em",
  gradient = false,
  stagger = 5,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const gradStyle: React.CSSProperties = gradient
    ? {
        backgroundImage: aiGradientCss(100),
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : { color };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${fontSize * 0.28}px`,
        perspective: 900,
        fontFamily,
        fontSize,
        fontWeight: weight,
        letterSpacing,
        lineHeight: 1,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 16, mass: 0.8, stiffness: 130 },
        });
        const rot = interpolate(p, [0, 1], [-95, 0]);
        const y = interpolate(p, [0, 1], [fontSize * 0.5, 0]);
        const blur = interpolate(p, [0, 0.7], [12, 0], { extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ display: "inline-block", transformStyle: "preserve-3d" }}>
            <span
              style={{
                display: "inline-block",
                transformOrigin: "50% 0%",
                transform: `translateY(${y}px) rotateX(${rot}deg)`,
                opacity: interpolate(p, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
                filter: `blur(${blur}px)`,
                ...gradStyle,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * Letter scramble / decode — characters cycle through random mono glyphs, then
 * lock in left-to-right. On-brand "AI resolving" feel for the URL.
 */
export const ScrambleText: React.FC<
  Common & { text: string; duration?: number; perChar?: number }
> = ({
  text,
  delay = 0,
  duration = 26,
  perChar = 2.2,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 500,
  letterSpacing = "0.01em",
  style,
}) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&/.";
  const chars = text.split("");
  return (
    <div style={{ fontFamily, fontSize, fontWeight: weight, letterSpacing, color, display: "inline-flex", ...style }}>
      {chars.map((c, i) => {
        const resolveAt = i * perChar;
        const settled = local - resolveAt;
        let glyph = c;
        let op = 1;
        if (settled < 0) {
          glyph = "";
          op = 0;
        } else if (settled < duration && c !== " ") {
          glyph = glyphs[Math.floor(rand(Math.floor(frame / 1.5) + i * 13) * glyphs.length)];
          op = 0.65;
        }
        return (
          <span key={i} style={{ opacity: op, display: "inline-block", minWidth: c === " " ? fontSize * 0.3 : undefined }}>
            {glyph === " " ? " " : glyph}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Tracking-in punch — text arrives wide and soft (big letter-spacing, blur,
 * scale) and snaps to its set tracking. A premium kinetic move.
 */
export const TrackingIn: React.FC<Common & { text: string; duration?: number }> = ({
  text,
  delay = 0,
  duration = 22,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 700,
  letterSpacing = "-0.02em",
  gradient = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const tracking = interpolate(t, [0, 1], [0.6, 0]);
  const scale = interpolate(t, [0, 1], [1.12, 1]);
  const blur = interpolate(t, [0, 0.8], [16, 0], { extrapolateRight: "clamp" });
  const gradStyle: React.CSSProperties = gradient
    ? { backgroundImage: aiGradientCss(100), WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
    : { color };
  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight: weight,
        letterSpacing: `calc(${letterSpacing} + ${tracking}em)`,
        transform: `scale(${scale})`,
        opacity: t,
        filter: `blur(${blur}px)`,
        whiteSpace: "nowrap",
        ...gradStyle,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Mask wipe — reveals children behind a moving clip edge. No fade, a wipe. */
export const MaskWipe: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: "left" | "bottom";
}> = ({ children, delay = 0, duration = 18, from = "left" }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const hidden = (1 - t) * 100;
  const clip = from === "left" ? `inset(0 ${hidden}% 0 0)` : `inset(${hidden}% 0 0 0)`;
  const shift = from === "left" ? `translateX(${(1 - t) * -12}px)` : `translateY(${(1 - t) * 16}px)`;
  return <div style={{ clipPath: clip, WebkitClipPath: clip, transform: shift }}>{children}</div>;
};
