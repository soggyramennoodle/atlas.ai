import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { Backdrop } from "../components/Backdrop";
import {
  WaveTile,
  GlowSummary,
  StatFragment,
  NavFragment,
  ReadyPill,
} from "../components/Fragments";
import { fontMono } from "../fonts";
import { atlas } from "../theme";
import { EASE_OUT } from "../anim";

const SHOT = 26; // frames per flash

/** One punchy close-up: fast scale + fade in, hold, quick out. */
const Flash: React.FC<{ children: React.ReactNode; scaleFrom?: number }> = ({
  children,
  scaleFrom = 0.86,
}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 5, SHOT - 6, SHOT], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(f, [0, 10], [scaleFrom, 1], {
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const y = interpolate(f, [0, 12], [16, 0], { extrapolateRight: "clamp", easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `scale(${scale}) translateY(${y}px)` }}>{children}</div>
    </AbsoluteFill>
  );
};

const Label: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      bottom: 520,
      width: "100%",
      textAlign: "center",
      fontFamily: fontMono,
      fontSize: 17,
      textTransform: "uppercase",
      letterSpacing: "0.32em",
      color: atlas.muted,
    }}
  >
    {text}
  </div>
);

/**
 * Fast (but not frantic) flashes of tiny product details — the glow, the live
 * waveform, a number counting up, the active pill. Each one a quick tease.
 */
export const SceneDetails: React.FC = () => {
  const shots = [
    { el: <WaveTile width={620} />, label: "Record" },
    { el: <GlowSummary width={760} />, label: "Atlas listens" },
    { el: <StatFragment value="1.2" suffix="k" label="Notes written" width={460} />, label: "" },
    { el: <NavFragment width={560} />, label: "" },
    {
      el: (
        <div style={{ transform: "scale(2.2)" }}>
          <ReadyPill />
        </div>
      ),
      label: "Done",
    },
  ];
  return (
    <AbsoluteFill>
      <Backdrop mode="light" drift />
      {shots.map((s, i) => (
        <Sequence key={i} from={i * SHOT} durationInFrames={SHOT}>
          <Flash>{s.el}</Flash>
          {s.label ? <Label text={s.label} /> : null}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const DETAILS_DURATION = 5 * SHOT;
