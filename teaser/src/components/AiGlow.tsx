import React from "react";
import { useCurrentFrame } from "remotion";
import { aiGradientCss } from "../theme";

/**
 * The Atlas "AI edge glow" — the fluid multicolor gradient border + soft
 * outside bloom that signals "this surface was made by Atlas" (see .ai-ring in
 * globals.css). Recreated as a masked border ring with a continuous hue-rotate,
 * so it loops seamlessly just like the product.
 */
export const AiGlow: React.FC<{
  radius?: number;
  intensity?: number; // 0..1
  speed?: number; // hue degrees per frame
}> = ({ radius = 12, intensity = 1, speed = 4 }) => {
  const frame = useCurrentFrame();
  const hue = (frame * speed) % 360;

  const ring: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    padding: 2,
    background: aiGradientCss(120),
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    filter: `hue-rotate(${hue}deg)`,
    opacity: 0.95 * intensity,
    pointerEvents: "none",
  };

  const bloom: React.CSSProperties = {
    position: "absolute",
    inset: -2,
    borderRadius: radius + 2,
    padding: 3,
    background: aiGradientCss(120),
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    filter: `blur(10px) hue-rotate(${hue}deg)`,
    opacity: 0.55 * intensity,
    pointerEvents: "none",
  };

  return (
    <>
      <div style={bloom} />
      <div style={ring} />
    </>
  );
};
