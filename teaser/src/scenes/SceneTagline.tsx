import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { atlas } from "../theme";
import { fontSans } from "../fonts";
import { EASE_OUT, snapFade } from "../anim";

/**
 * The product promise. Two snappy lines — "Sit back" / "and listen." — the
 * second in the Atlas green, exactly like the landing hero headline.
 */
export const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();

  const line = (start: number) => {
    const o = snapFade(frame, start, 9);
    const y = interpolate(frame, [start, start + 16], [26, 0], {
      extrapolateRight: "clamp",
      easing: EASE_OUT,
    });
    const blur = interpolate(frame, [start, start + 12], [10, 0], {
      extrapolateRight: "clamp",
    });
    return { opacity: o, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` };
  };

  return (
    <AbsoluteFill>
      <Backdrop mode="dark" drift />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: fontSans,
            fontWeight: 700,
            fontSize: 116,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
        >
          <div style={{ ...line(2), color: "#ffffff" }}>Sit back</div>
          <div style={{ ...line(12), color: atlas.primaryDark }}>and listen.</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
