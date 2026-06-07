import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { aiGradientCss } from "../theme";
import { EASE_OUT } from "../anim";

type Base = {
  delay?: number;
  color?: string;
  fontFamily: string;
  fontSize: number;
  weight?: number;
  letterSpacing?: string;
  lineHeight?: number;
  gradient?: boolean;
  align?: "center" | "flex-start";
  style?: React.CSSProperties;
};

const gradientStyle = (on?: boolean, color = "#fff"): React.CSSProperties =>
  on
    ? {
        backgroundImage: aiGradientCss(100),
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : { color };

/**
 * Masked word reveal — each word rises from behind a hard clip with a spring
 * (a hair of overshoot) and de-blurs. No fade-up, no flips: the clean, dynamic
 * reveal used in pro motion graphics. Words stagger.
 */
export const LineReveal: React.FC<Base & { text: string; stagger?: number; overshoot?: boolean }> = ({
  text,
  delay = 0,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 800,
  letterSpacing = "-0.02em",
  lineHeight = 1.02,
  gradient = false,
  align = "center",
  stagger = 4,
  overshoot = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const pb = fontSize * 0.2; // room for descenders inside the clip
  const g = gradientStyle(gradient, color);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align,
        gap: `${fontSize * 0.16}px ${fontSize * 0.28}px`,
        fontFamily,
        fontSize,
        fontWeight: weight,
        letterSpacing,
        lineHeight,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: overshoot
            ? { damping: 13, mass: 0.85, stiffness: 135 }
            : { damping: 200, mass: 1, stiffness: 130 },
        });
        const ty = (1 - p) * 112;
        const blur = interpolate(p, [0, 0.55], [9, 0], { extrapolateRight: "clamp" });
        const op = interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: pb,
              marginBottom: -pb,
              verticalAlign: "bottom",
            }}
          >
            <span style={{ display: "block", transform: `translateY(${ty}%)`, filter: `blur(${blur}px)`, opacity: op, ...g }}>
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Masked character reveal — same language, per glyph. For the URL. */
export const CharReveal: React.FC<Base & { text: string; perChar?: number }> = ({
  text,
  delay = 0,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 500,
  letterSpacing = "0.01em",
  align = "center",
  perChar = 1.8,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split("");
  const pb = fontSize * 0.22;
  return (
    <div style={{ display: "flex", justifyContent: align, fontFamily, fontSize, fontWeight: weight, letterSpacing, color, ...style }}>
      {chars.map((c, i) => {
        if (c === " ") return <span key={i} style={{ width: fontSize * 0.34 }} />;
        const p = spring({ frame: frame - delay - i * perChar, fps, config: { damping: 14, mass: 0.7, stiffness: 150 } });
        const ty = (1 - p) * 118;
        const op = interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: pb, marginBottom: -pb, verticalAlign: "bottom" }}>
            <span style={{ display: "block", transform: `translateY(${ty}%)`, opacity: op }}>{c}</span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * Tracking-in — text arrives a touch wide + soft and snaps to its tracking.
 * Reserved for small eyebrow/caption lines where it stays subtle.
 */
export const TrackingIn: React.FC<Base & { text: string; duration?: number }> = ({
  text,
  delay = 0,
  duration = 24,
  color = "#fff",
  fontFamily,
  fontSize,
  weight = 500,
  letterSpacing = "0.3em",
  gradient = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const tracking = interpolate(t, [0, 1], [0.5, 0]);
  const blur = interpolate(t, [0, 0.8], [10, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight: weight,
        letterSpacing: `calc(${letterSpacing} + ${tracking}em)`,
        opacity: t,
        filter: `blur(${blur}px)`,
        whiteSpace: "nowrap",
        ...gradientStyle(gradient, color),
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Mask wipe — reveals children behind a moving clip edge. */
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
  const shift = from === "left" ? `translateX(${(1 - t) * -10}px)` : `translateY(${(1 - t) * 14}px)`;
  return <div style={{ clipPath: clip, WebkitClipPath: clip, transform: shift }}>{children}</div>;
};
