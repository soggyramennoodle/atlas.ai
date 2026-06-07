import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import { AtlasMark } from "../components/AtlasMark";
import { atlas, aiGradientCss } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { slowFade, snapFade, EASE_OUT } from "../anim";

/**
 * The sign-off. Logo seats on the night canvas, then the URL is teased: the
 * recognizable "atlas." resolves crisply, but the TLD only ever ghosts in —
 * blurred, low-opacity, flickering behind a blinking caret. Never the full
 * address. A hairline AI-gradient underline glows beneath it.
 */
export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markP = spring({ frame: frame - 4, fps, config: { damping: 18, mass: 0.9, stiffness: 110 } });
  const markScale = interpolate(markP, [0, 1], [0.7, 1]);
  const logoOpacity = slowFade(frame, 4, 24);

  // "atlas." types/resolves crisply.
  const urlStart = 34;
  const known = "atlas.";
  const charsShown = Math.floor(
    interpolate(frame, [urlStart, urlStart + 18], [0, known.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const urlOpacity = snapFade(frame, urlStart, 8);

  // The TLD only ghosts in — never resolves. It breathes and stays blurred.
  const ghostBase = interpolate(frame, [urlStart + 18, urlStart + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const ghostFlicker = 0.28 + Math.sin(frame / 6) * 0.14 + Math.sin(frame / 2.3) * 0.05;
  const ghostOpacity = ghostBase * Math.max(0, ghostFlicker);
  const ghostBlur = 6 + Math.sin(frame / 9) * 2;

  // Blinking caret.
  const caretOn = Math.floor(frame / 14) % 2 === 0;
  const caretOpacity = frame > urlStart + 14 ? (caretOn ? 1 : 0) : 0;

  // Underline glow grows under the wordmark.
  const underline = interpolate(frame, [urlStart + 6, urlStart + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const tagOpacity = slowFade(frame, urlStart + 30, 26);

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: logoOpacity,
            transform: `scale(${markScale})`,
            filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.6))",
          }}
        >
          <AtlasMark size={70} color="#ffffff" />
          <span
            style={{
              fontFamily: fontSans,
              fontWeight: 600,
              fontSize: 64,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Atlas
          </span>
        </div>

        {/* URL tease */}
        <div
          style={{
            marginTop: 46,
            position: "relative",
            opacity: urlOpacity,
            display: "flex",
            alignItems: "baseline",
            fontFamily: fontMono,
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: "0.02em",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.95)" }}>{known.slice(0, charsShown)}</span>
          {/* Ghosted TLD — present, but never legible. */}
          <span
            style={{
              color: atlas.primaryDark,
              opacity: ghostOpacity,
              filter: `blur(${ghostBlur}px)`,
              marginLeft: 2,
            }}
          >
            ai
          </span>
          {/* Caret */}
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 38,
              marginLeft: 6,
              background: atlas.primaryDark,
              opacity: caretOpacity,
              transform: "translateY(4px)",
            }}
          />
          {/* AI-gradient underline glow */}
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: -16,
              height: 2,
              width: `${underline * 100}%`,
              maxWidth: 260,
              background: aiGradientCss(90),
              boxShadow: `0 0 18px 1px ${atlas.aiGradient[1]}`,
              borderRadius: 999,
            }}
          />
        </div>

        {/* Closing line */}
        <div
          style={{
            marginTop: 54,
            fontFamily: fontMono,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.34em",
            color: "rgba(255,255,255,0.5)",
            opacity: tagOpacity,
          }}
        >
          Your lectures, beautifully noted
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
