import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SceneLogo } from "./scenes/SceneLogo";
import { ScenePlane, PLANE_DURATION } from "./scenes/ScenePlane";
import { SceneDetails, DETAILS_DURATION } from "./scenes/SceneDetails";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneUrlDrop } from "./scenes/SceneUrlDrop";
import { FontFaces } from "./fonts";

const CF = 14; // crossfade length in frames

/** Wraps a scene so it crossfades in/out at its boundaries. */
const Fade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, CF, durationInFrames - CF, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// Scene durations (30fps). Sequences overlap by CF so the fades cross.
const D = {
  logo: 80,
  plane: PLANE_DURATION, // 280 — the slow tease
  details: DETAILS_DURATION, // 130 — the fast flashes
  tagline: 56,
  url: 100,
};

// Start frames, each beginning CF before the previous one ends.
const S = {
  logo: 0,
  plane: D.logo - CF,
  details: D.logo - CF + D.plane - CF,
  tagline: D.logo - CF + D.plane - CF + D.details - CF,
  url: D.logo - CF + D.plane - CF + D.details - CF + D.tagline - CF,
};

export const TEASER_DURATION = S.url + D.url;

export const AtlasTeaser: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#08080C" }}>
      <FontFaces />

      <Sequence from={S.logo} durationInFrames={D.logo}>
        <Fade durationInFrames={D.logo}>
          <SceneLogo />
        </Fade>
      </Sequence>

      <Sequence from={S.plane} durationInFrames={D.plane}>
        <Fade durationInFrames={D.plane}>
          <ScenePlane />
        </Fade>
      </Sequence>

      <Sequence from={S.details} durationInFrames={D.details}>
        <Fade durationInFrames={D.details}>
          <SceneDetails />
        </Fade>
      </Sequence>

      <Sequence from={S.tagline} durationInFrames={D.tagline}>
        <Fade durationInFrames={D.tagline}>
          <SceneTagline />
        </Fade>
      </Sequence>

      <Sequence from={S.url} durationInFrames={D.url}>
        <Fade durationInFrames={D.url}>
          <SceneUrlDrop />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
};
