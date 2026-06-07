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
 * The sign-off. The mark + wordmark seat, then the URL is dropped — clearly,
 * confidently — with a snappy scale and an AI-gradient underline that sweeps
 * in beneath it. No hiding this time.
 */
export const SceneUrlDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markP = spring({ frame: frame - 4, fps, config: { damping: 18, mass: 0.9, stiffness: 110 } });
  const markScale = interpolate(markP, [0, 1], [0.7, 1]);
  const logoOpacity = slowFade(frame, 4, 22);
  const logoY = interpolate(frame, [40, 70], [0, -10], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  // URL drops in: snappy scale-down into place with a quick fade.
  const urlStart = 38;
  const urlP = spring({ frame: frame - urlStart, fps, config: { damping: 16, mass: 0.8, stiffness: 130 } });
  const urlScale = interpolate(urlP, [0, 1], [1.18, 1]);
  const urlOpacity = snapFade(frame, urlStart, 7);

  const underline = interpolate(frame, [urlStart + 6, urlStart + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

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
            transform: `translateY(${logoY}px) scale(${markScale})`,
            filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.6))",
          }}
        >
          <AtlasMark size={88} color="#ffffff" />
          <span
            style={{
              fontFamily: fontSans,
              fontWeight: 600,
              fontSize: 84,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Atlas
          </span>
        </div>

        {/* URL — dropped clearly. */}
        <div
          style={{
            marginTop: 70,
            position: "relative",
            opacity: urlOpacity,
            transform: `scale(${urlScale})`,
          }}
        >
          <div
            style={{
              fontFamily: fontMono,
              fontWeight: 500,
              fontSize: 60,
              letterSpacing: "0.01em",
              color: "#ffffff",
            }}
          >
            atlasai.ca
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: -22,
              height: 3,
              width: `${underline * 100}%`,
              maxWidth: 420,
              background: aiGradientCss(90),
              boxShadow: `0 0 22px 1px ${atlas.aiGradient[1]}`,
              borderRadius: 999,
            }}
          />
        </div>

        {/* Closing line */}
        <div
          style={{
            marginTop: 80,
            fontFamily: fontMono,
            fontSize: 19,
            textTransform: "uppercase",
            letterSpacing: "0.34em",
            color: "rgba(255,255,255,0.55)",
            opacity: slowFade(frame, urlStart + 26, 24),
          }}
        >
          Your lectures, beautifully noted
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
