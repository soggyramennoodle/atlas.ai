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
import { atlas } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { slowFade, EASE_OUT } from "../anim";

/**
 * Cold open. On the near-black canvas, geometric shards drift in 3D and
 * converge into the Atlas mark, which rotates flat out of space (slow fade).
 * The wordmark then resolves beneath it.
 */
export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Mark: rotate flat out of 3D, slow elegant fade.
  const markP = spring({ frame: frame - 8, fps, config: { damping: 20, mass: 1.1, stiffness: 90 } });
  const markOpacity = slowFade(frame, 8, 36);
  const markRotY = interpolate(markP, [0, 1], [85, 0]);
  const markRotX = interpolate(markP, [0, 1], [-30, 0]);
  const markZ = interpolate(markP, [0, 1], [-700, 0]);
  const markScale = interpolate(markP, [0, 1], [0.6, 1]);

  // Wordmark resolves a beat after the mark seats.
  const wordOpacity = slowFade(frame, 40, 26);
  const wordY = interpolate(frame, [40, 70], [18, 0], {
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  // Eyebrow.
  const eyebrowOpacity = slowFade(frame, 58, 22);

  // Converging shards (decorative facets of the brand palette).
  const shards = [
    { x: -360, y: -220, c: atlas.aiGradient[0], s: 26, d: 0 },
    { x: 320, y: -160, c: atlas.aiGradient[1], s: 18, d: 4 },
    { x: -280, y: 220, c: atlas.aiGradient[2], s: 22, d: 8 },
    { x: 380, y: 200, c: atlas.aiGradient[3], s: 16, d: 2 },
    { x: 0, y: -300, c: atlas.aiGradient[5], s: 14, d: 6 },
    { x: -440, y: 40, c: atlas.aiGradient[4], s: 12, d: 10 },
  ];

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" />
      <AbsoluteFill style={{ perspective: 1400 }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {/* Shards */}
          {shards.map((sh, i) => {
            const p = spring({ frame: frame - sh.d, fps, config: { damping: 26, mass: 1, stiffness: 70 } });
            const fade = interpolate(p, [0, 0.7, 1], [0, 0.9, 0]);
            const x = interpolate(p, [0, 1], [sh.x, 0]);
            const y = interpolate(p, [0, 1], [sh.y, 0]);
            const rot = interpolate(p, [0, 1], [0, 180]);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: sh.s,
                  height: sh.s,
                  transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                  background: sh.c,
                  opacity: fade,
                  borderRadius: 2,
                  filter: "blur(0.3px)",
                  boxShadow: `0 0 24px ${sh.c}`,
                }}
              />
            );
          })}

          {/* Mark */}
          <div
            style={{
              transform: `translateZ(${markZ}px) rotateX(${markRotX}deg) rotateY(${markRotY}deg) scale(${markScale})`,
              opacity: markOpacity,
              filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.6))",
            }}
          >
            <AtlasMark size={150} color="#ffffff" />
          </div>

          {/* Wordmark + eyebrow */}
          <div
            style={{
              marginTop: 34,
              textAlign: "center",
              opacity: wordOpacity,
              transform: `translateY(${wordY}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fontSans,
                fontWeight: 600,
                fontSize: 64,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                lineHeight: 1,
              }}
            >
              Atlas
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: fontMono,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.34em",
              color: "rgba(255,255,255,0.55)",
              opacity: eyebrowOpacity,
            }}
          >
            A note taker, made for you
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
