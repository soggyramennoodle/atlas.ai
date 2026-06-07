import React from "react";
import { ATLAS_MARK_PATH } from "../theme";

/**
 * The Atlas mark — the geometric, interlocking "A". Renders in `currentColor`
 * (via the `color` style) so it inherits whatever surface it sits on, exactly
 * like the app's <AtlasMark/>.
 */
export const AtlasMark: React.FC<{
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ size = 80, color = "currentColor", style }) => {
  return (
    <svg
      viewBox="0 0 100 90.96"
      width={size}
      height={(size * 90.96) / 100}
      style={style}
      aria-hidden
    >
      <path fill={color} fillRule="evenodd" d={ATLAS_MARK_PATH} />
    </svg>
  );
};
