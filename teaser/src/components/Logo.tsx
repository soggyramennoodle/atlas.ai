import React from "react";
import { AtlasMark } from "./AtlasMark";
import { atlas } from "../theme";
import { fontSans, fontMono } from "../fonts";

/** The Atlas wordmark: mark + "Atlas", kerned tight, with an optional beta pill. */
export const Logo: React.FC<{
  markSize?: number;
  fontSize?: number;
  color?: string;
  markColor?: string;
  beta?: boolean;
  gap?: number;
}> = ({
  markSize = 30,
  fontSize = 26,
  color = atlas.ink,
  markColor = atlas.primary,
  beta = false,
  gap = 10,
}) => {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap }}>
      <AtlasMark size={markSize} color={markColor} />
      <span
        style={{
          fontFamily: fontSans,
          fontWeight: 600,
          fontSize,
          letterSpacing: "-0.02em",
          color,
          lineHeight: 1,
        }}
      >
        Atlas
      </span>
      {beta && (
        <span
          style={{
            position: "relative",
            top: -fontSize * 0.32,
            fontFamily: fontMono,
            fontSize: fontSize * 0.4,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: atlas.primary,
            border: `1px solid ${atlas.primary}55`,
            borderRadius: 999,
            padding: "2px 6px",
            lineHeight: 1,
            background: `${atlas.primary}14`,
          }}
        >
          beta
        </span>
      )}
    </div>
  );
};
