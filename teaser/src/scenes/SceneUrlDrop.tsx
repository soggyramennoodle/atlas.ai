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
import { ScrambleText, MaskWipe, TrackingIn } from "../components/KineticText";
import { atlas, aiGradientCss } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { EASE_OUT } from "../anim";

/**
 * The sign-off. The mark snaps in and the wordmark wipes open, then the URL
 * decodes into place — characters scrambling through glyphs before locking to
 * atlasai.ca — over an AI-gradient underline that sweeps in. Dropped, clearly.
 */
export const SceneUrlDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markP = spring({ frame: frame - 2, fps, config: { damping: 14, mass: 0.8, stiffness: 140 } });
  const markScale = interpolate(markP, [0, 1], [0.55, 1]);
  const markRot = interpolate(markP, [0, 1], [-40, 0]);
  const logoY = interpolate(frame, [44, 78], [0, -12], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  const urlStart = 30;
  const urlPop = spring({ frame: frame - urlStart, fps, config: { damping: 16, mass: 0.7, stiffness: 150 } });
  const urlScale = interpolate(urlPop, [0, 1], [1.14, 1]);

  const underline = interpolate(frame, [urlStart + 10, urlStart + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Logo — mark snaps + spins flat, wordmark wipes open. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, transform: `translateY(${logoY}px)` }}>
          <div
            style={{
              transform: `scale(${markScale}) rotate(${markRot}deg)`,
              filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.6))",
            }}
          >
            <AtlasMark size={92} color="#ffffff" />
          </div>
          <MaskWipe delay={10} duration={16}>
            <span style={{ fontFamily: fontSans, fontWeight: 600, fontSize: 88, letterSpacing: "-0.03em", color: "#fff" }}>
              Atlas
            </span>
          </MaskWipe>
        </div>

        {/* URL — decodes into place. */}
        <div style={{ marginTop: 76, position: "relative", transform: `scale(${urlScale})` }}>
          <ScrambleText
            text="atlasai.ca"
            delay={urlStart}
            duration={22}
            perChar={2.4}
            fontFamily={fontMono}
            fontSize={66}
            weight={500}
            color="#fff"
            style={{ justifyContent: "center" }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: -24,
              height: 3,
              width: `${underline * 100}%`,
              maxWidth: 440,
              background: aiGradientCss(90),
              boxShadow: `0 0 24px 1px ${atlas.aiGradient[1]}`,
              borderRadius: 999,
            }}
          />
        </div>

        {/* Closing line. */}
        <div style={{ marginTop: 86 }}>
          <TrackingIn
            text="YOUR LECTURES, BEAUTIFULLY NOTED"
            delay={urlStart + 22}
            duration={26}
            fontFamily={fontMono}
            fontSize={19}
            weight={500}
            letterSpacing="0.3em"
            color="rgba(255,255,255,0.55)"
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
