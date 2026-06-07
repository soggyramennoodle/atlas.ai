import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SceneLogo } from "./scenes/SceneLogo";
import { SceneTagline } from "./scenes/SceneTagline";
import { SceneAssemble } from "./scenes/SceneAssemble";
import { SceneOutro } from "./scenes/SceneOutro";
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
const D = { logo: 120, tagline: 72, assemble: 304, outro: 150 };
const S = {
  logo: 0,
  tagline: D.logo - CF, // 106
  assemble: D.logo - CF + D.tagline - CF, // 164
  outro: D.logo - CF + D.tagline - CF + D.assemble - CF, // 454
};

export const TEASER_DURATION =
  S.outro + D.outro; // 604

export const AtlasTeaser: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#08080C" }}>
      <FontFaces />
      <Sequence from={S.logo} durationInFrames={D.logo}>
        <Fade durationInFrames={D.logo}>
          <SceneLogo />
        </Fade>
      </Sequence>

      <Sequence from={S.tagline} durationInFrames={D.tagline}>
        <Fade durationInFrames={D.tagline}>
          <SceneTagline />
        </Fade>
      </Sequence>

      <Sequence from={S.assemble} durationInFrames={D.assemble}>
        <Fade durationInFrames={D.assemble}>
          <SceneAssemble />
        </Fade>
      </Sequence>

      <Sequence from={S.outro} durationInFrames={D.outro}>
        <Fade durationInFrames={D.outro}>
          <SceneOutro />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
};
