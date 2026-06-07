import React from "react";
import { atlas } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { AiGlow } from "./AiGlow";

const Sparkles: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = atlas.primary,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"
      fill={color}
    />
    <path d="M19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14z" fill={color} />
  </svg>
);

/**
 * The hero NotePreview — a captured lecture turned into a structured note. The
 * AI summary wears the fluid edge glow (it's the AI-signed surface); the rest is
 * the plain note body. Reconstructed close to the real component, but it's a
 * teaser, so the copy stays light and the bottom fades into the canvas.
 */
export const NotePreviewCard: React.FC<{
  width?: number;
  reveal?: number; // 0..1 — how much of the note body has "written in"
}> = ({ width = 760, reveal = 1 }) => {
  return (
    <div style={{ position: "relative", width }}>
      <div
        style={{
          overflow: "hidden",
          borderRadius: 8,
          border: `1px solid ${atlas.border}`,
          background: atlas.card,
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.06), 0 30px 80px -36px rgba(0,0,0,0.30)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: `1px solid ${atlas.border}`,
            padding: "22px 28px 18px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: fontMono,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: atlas.muted,
              }}
            >
              Biology 1A03 · Lecture 12
            </p>
            <h2
              style={{
                margin: "6px 0 0",
                fontFamily: fontSans,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: atlas.ink,
              }}
            >
              Photosynthesis &amp; the light reactions
            </h2>
          </div>
          <span
            style={{
              fontFamily: fontMono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: atlas.muted,
              border: `1px solid ${atlas.border}`,
              borderRadius: 4,
              padding: "6px 10px",
              whiteSpace: "nowrap",
            }}
          >
            48 min
          </span>
        </div>

        {/* Body grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 22,
            padding: "26px 28px 30px",
          }}
        >
          {/* AI summary — the AI-signed surface, with the fluid edge glow. */}
          <div
            style={{
              position: "relative",
              borderRadius: 8,
              background: atlas.card,
              padding: 22,
            }}
          >
            <AiGlow radius={8} intensity={reveal} />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: fontMono,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: atlas.primary,
              }}
            >
              <Sparkles /> Summary
            </span>
            <p
              style={{
                margin: "14px 0 0",
                fontFamily: fontSans,
                fontSize: 15,
                lineHeight: 1.65,
                color: `${atlas.ink}d9`,
                clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
              }}
            >
              Chloroplasts convert light into chemical energy: the
              light-dependent reactions in the thylakoid membrane, photosystems
              II and I, and how the proton gradient drives ATP synthase.
            </p>
          </div>

          {/* Plain note body — no glow. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: fontSans,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: atlas.ink,
                }}
              >
                Key concepts
              </h3>
              <ul
                style={{
                  margin: "10px 0 0",
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                {["Thylakoid & stroma", "PSII → PSI electron flow", "ATP synthase"].map(
                  (t) => (
                    <li
                      key={t}
                      style={{
                        fontFamily: fontSans,
                        fontSize: 13.5,
                        color: atlas.muted,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: `${atlas.primary}a6`,
                        }}
                      />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Light reactions", "NADPH", "Calvin cycle"].map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: fontMono,
                    fontSize: 10.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: atlas.muted,
                    border: `1px solid ${atlas.border}`,
                    borderRadius: 4,
                    padding: "5px 8px",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
