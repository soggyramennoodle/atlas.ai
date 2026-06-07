import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { KineticWords } from "../components/KineticText";
import { atlas, aiGradientCss } from "../theme";
import { fontSans } from "../fonts";
import { EASE_OUT } from "../anim";

/**
 * The promise, as the kinetic climax. "Sit back" unfolds in 3D, "and listen."
 * unfolds in the AI gradient a beat later, over a gradient seam that wipes
 * across the screen.
 */
export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const seam = interpolate(frame, [10, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" drift />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 18 }}>
        <KineticWords text="Sit back" fontFamily={fontSans} fontSize={150} weight={800} color="#fff" />
        {/* Gradient seam sweeping between the two lines. */}
        <div
          style={{
            height: 3,
            width: `${seam * 70}%`,
            maxWidth: 760,
            background: aiGradientCss(90),
            boxShadow: `0 0 26px 1px ${atlas.aiGradient[1]}`,
            borderRadius: 999,
          }}
        />
        <KineticWords text="and listen." fontFamily={fontSans} fontSize={150} weight={800} gradient delay={12} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
