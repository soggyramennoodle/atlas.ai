import React from "react";
import { Composition } from "remotion";
import { AtlasTeaser, TEASER_DURATION } from "./Teaser";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AtlasTeaser"
      component={AtlasTeaser}
      durationInFrames={TEASER_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
