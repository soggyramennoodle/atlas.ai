import React from "react";
import { useCurrentFrame } from "remotion";
import { atlas } from "../theme";
import { fontMono } from "../fonts";

/**
 * The "live capture" chip from the landing hero — a red recording dot, a tiny
 * animated waveform, and a running timecode. Overlaps the top edge of the note
 * card just like the product.
 */
export const RecordingChip: React.FC<{ time?: string }> = ({ time = "47:32" }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.96)",
        border: `1px solid ${atlas.border}`,
        borderRadius: 6,
        padding: "8px 14px",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.06), 0 12px 30px -14px rgba(0,0,0,0.32)",
      }}
    >
      <span style={{ position: "relative", display: "grid", placeItems: "center", width: 9, height: 9 }}>
        <span
          style={{
            position: "absolute",
            width: 9 + (Math.sin(frame / 7) + 1) * 5,
            height: 9 + (Math.sin(frame / 7) + 1) * 5,
            borderRadius: 999,
            background: "#e5484d",
            opacity: 0.35 - (Math.sin(frame / 7) + 1) * 0.12,
          }}
        />
        <span style={{ width: 9, height: 9, borderRadius: 999, background: "#e5484d" }} />
      </span>
      <span
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: `${atlas.ink}b3`,
        }}
      >
        Recording
      </span>
      <span style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const h = 4 + (Math.sin(frame / 4 + i * 0.9) * 0.5 + 0.5) * 10;
          return (
            <span
              key={i}
              style={{ width: 2, height: h, borderRadius: 999, background: `${atlas.ink}59` }}
            />
          );
        })}
      </span>
      <span
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          color: atlas.muted,
        }}
      >
        {time}
      </span>
    </div>
  );
};
