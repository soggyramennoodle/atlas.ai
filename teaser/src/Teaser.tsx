import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SceneLogo } from "./scenes/SceneLogo";
import { ScenePlane, PLANE_DURATION } from "./scenes/ScenePlane";
import { SceneMontage, MONTAGE_DURATION } from "./scenes/SceneMontage";
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
  logo: 90,
  plane: PLANE_DURATION, // short — ends on the recording box at the bottom
  montage: MONTAGE_DURATION, // the busy, dark, kinetic middle
  tagline: 64,
  url: 104,
};

const order = ["logo", "plane", "montage", "tagline", "url"] as const;
const S = (() => {
  let acc = 0;
  const out = {} as Record<(typeof order)[number], number>;
  order.forEach((k, i) => {
    out[k] = acc;
    acc += D[k] - (i < order.length - 1 ? CF : 0);
  });
  return out;
})();

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

      <Sequence from={S.montage} durationInFrames={D.montage}>
        <Fade durationInFrames={D.montage}>
          <SceneMontage />
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
