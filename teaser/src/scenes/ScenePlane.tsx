import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Backdrop, Grain } from "../components/Backdrop";
import { AtlasMark } from "../components/AtlasMark";
import {
  GlowSummary,
  NavFragment,
  NoteHeader,
  StatFragment,
  ConceptList,
  WaveTile,
} from "../components/Fragments";
import { atlas } from "../theme";
import { settleSpring } from "../anim";

export const PLANE_DURATION = 280;

/**
 * The teasing centerpiece. UI fragments stand on a receding 3D floor and, one
 * by one, hinge down from upright to flat as the camera slowly travels forward
 * across the plane. You only ever catch cropped pieces — the glowing summary
 * edge, a stat number, the active nav pill — never the whole product.
 */
export const ScenePlane: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow forward travel across the floor.
  const panY = interpolate(frame, [0, PLANE_DURATION], [520, -1820]);

  // Fragments placed along the floor's depth (top) with a horizontal offset
  // (left) so several bleed past the frame edges. start = when they hinge down.
  const items: {
    top: number;
    left: number;
    start: number;
    el: React.ReactNode;
  }[] = [
    { top: 1820, left: 300, start: 4, el: <WaveTile width={420} /> },
    { top: 1520, left: 250, start: 14, el: <GlowSummary width={640} /> },
    { top: 1140, left: 360, start: 30, el: <NoteHeader width={680} /> },
    { top: 860, left: 250, start: 44, el: <StatFragment value="94" suffix="hrs" label="Hours saved" width={340} /> },
    { top: 600, left: 470, start: 56, el: <ConceptList width={420} /> },
    { top: 300, left: 230, start: 72, el: <NavFragment width={420} /> },
    { top: 20, left: 430, start: 88, el: <GlowSummary width={620} /> },
    { top: -300, left: 250, start: 104, el: <StatFragment value="1.2" suffix="k" label="Notes written" width={360} /> },
  ];

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      <AbsoluteFill style={{ perspective: 1300, perspectiveOrigin: "50% 26%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: 1920,
            transformStyle: "preserve-3d",
            transformOrigin: "50% 50%",
            transform: `rotateX(62deg) rotateZ(-2deg) translateY(${panY}px)`,
          }}
        >
          {/* Floor guide lines + brand watermark, so the plane reads as a plane. */}
          <div
            style={{
              position: "absolute",
              left: -800,
              top: -800,
              width: 2680,
              height: 3600,
              backgroundImage: `linear-gradient(to right, ${atlas.ink}0f 1px, transparent 1px), linear-gradient(to bottom, ${atlas.ink}0f 1px, transparent 1px)`,
              backgroundSize: "120px 120px",
              WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent 75%)",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent 75%)",
            }}
          />
          <div style={{ position: "absolute", left: 250, top: 60, opacity: 0.05 }}>
            <AtlasMark size={620} color={atlas.ink} />
          </div>

          {items.map((it, i) => {
            const p = settleSpring(frame, it.start, fps, {
              damping: 20,
              mass: 1.1,
              stiffness: 70,
            });
            // Hinge from upright (counter the floor tilt so it faces camera) to
            // flat on the floor; a little lift that settles to zero.
            const layRot = interpolate(p, [0, 1], [-62, 0]);
            const lift = interpolate(p, [0, 1], [190, 0]);
            const opacity = interpolate(p, [0, 0.25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: it.left,
                  top: it.top,
                  transformStyle: "preserve-3d",
                  transformOrigin: "50% 100%",
                  transform: `translateZ(${lift}px) rotateX(${layRot}deg)`,
                  opacity,
                  filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.16))",
                }}
              >
                {it.el}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.03} />
    </AbsoluteFill>
  );
};
