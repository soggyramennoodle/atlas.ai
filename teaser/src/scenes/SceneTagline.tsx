import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { LineReveal } from "../components/KineticText";
import { atlas, aiGradientCss } from "../theme";
import { fontSans } from "../fonts";
import { EASE_OUT } from "../anim";

/**
 * The promise, as the kinetic climax. Two lines rise from behind a clip — the
 * second in the AI gradient — over a thin gradient seam that wipes between them.
 */
export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const seam = interpolate(frame, [12, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" drift />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 6 }}>
        <LineReveal text="Sit back" fontFamily={fontSans} fontSize={148} weight={800} color="#fff" />
        <div
          style={{
            height: 3,
            width: `${seam * 56}%`,
            maxWidth: 560,
            margin: "10px 0",
            background: aiGradientCss(90),
            boxShadow: `0 0 22px 1px ${atlas.aiGradient[1]}`,
            borderRadius: 999,
          }}
        />
        <LineReveal text="and listen." fontFamily={fontSans} fontSize={148} weight={800} gradient delay={10} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
