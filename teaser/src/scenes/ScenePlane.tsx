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
  NoteHeader,
  StatFragment,
  ConceptList,
  WaveTile,
} from "../components/Fragments";
import { atlas } from "../theme";
import { settleSpring } from "../anim";

export const PLANE_DURATION = 124;

/**
 * The teasing opener. UI fragments hinge down flat onto a receding 3D floor in
 * a quick cascade from back to front — and the shot ends the instant the last
 * one, the live-recording box, seats fully visible at the bottom of the frame.
 */
export const ScenePlane: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // A restrained push so the plane breathes without scrolling away.
  const panY = interpolate(frame, [0, PLANE_DURATION], [70, -60]);

  const items: {
    top: number;
    left: number;
    start: number;
    el: React.ReactNode;
  }[] = [
    { top: -300, left: 360, start: 2, el: <ConceptList width={520} /> },
    { top: -20, left: 150, start: 12, el: <StatFragment value="94" suffix="hrs" label="Hours saved" width={460} /> },
    { top: 320, left: 360, start: 24, el: <GlowSummary width={780} /> },
    { top: 680, left: 150, start: 40, el: <NoteHeader width={820} /> },
    // Last + nearest — the recording box, seating at the bottom of the frame.
    { top: 1360, left: 230, start: 58, el: <WaveTile width={680} /> },
  ];

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      <AbsoluteFill style={{ perspective: 1250, perspectiveOrigin: "50% 20%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: 1920,
            transformStyle: "preserve-3d",
            transformOrigin: "50% 50%",
            transform: `rotateX(58deg) rotateZ(-1.5deg) translateY(${panY}px)`,
          }}
        >
          {/* Floor guides + brand watermark so the plane reads as a plane. */}
          <div
            style={{
              position: "absolute",
              left: -900,
              top: -900,
              width: 2880,
              height: 3800,
              backgroundImage: `linear-gradient(to right, ${atlas.ink}0f 1px, transparent 1px), linear-gradient(to bottom, ${atlas.ink}0f 1px, transparent 1px)`,
              backgroundSize: "130px 130px",
              WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 42%, black, transparent 75%)",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 42%, black, transparent 75%)",
            }}
          />
          <div style={{ position: "absolute", left: 320, top: 120, opacity: 0.05 }}>
            <AtlasMark size={620} color={atlas.ink} />
          </div>

          {items.map((it, i) => {
            const p = settleSpring(frame, it.start, fps, {
              damping: 19,
              mass: 1,
              stiffness: 85,
            });
            const layRot = interpolate(p, [0, 1], [-58, 0]);
            const lift = interpolate(p, [0, 1], [200, 0]);
            const opacity = interpolate(p, [0, 0.22], [0, 1], {
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
                  filter: "drop-shadow(0 36px 46px rgba(0,0,0,0.18))",
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
