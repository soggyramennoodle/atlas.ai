import React from "react";
import { useCurrentFrame } from "remotion";
import { atlas } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { AiGlow } from "./AiGlow";

const card: React.CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${atlas.border}`,
  background: atlas.card,
  boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 24px 60px -34px rgba(0,0,0,0.30)",
};

/** The AI-summary card — the "glowing stuff". Mostly glow + a teased line. */
export const GlowSummary: React.FC<{ width?: number }> = ({ width = 560 }) => (
  <div style={{ ...card, position: "relative", width, padding: 26 }}>
    <AiGlow radius={10} />
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fontMono,
        fontSize: 15,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: atlas.primary,
      }}
    >
      <Spark /> Summary
    </span>
    <p
      style={{
        margin: "16px 0 0",
        fontFamily: fontSans,
        fontSize: 18,
        lineHeight: 1.6,
        color: `${atlas.ink}d9`,
      }}
    >
      Chloroplasts convert light into chemical energy
      <span style={{ color: `${atlas.ink}33` }}> — the light-dependent reactions…</span>
    </p>
  </div>
);

/** A sidebar nav sliver with the glowing active pill. */
export const NavFragment: React.FC<{ width?: number }> = ({ width = 360 }) => {
  const items = ["Dashboard", "Record a lecture", "What's new"];
  return (
    <div style={{ ...card, width, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((label, i) => {
        const active = i === 0;
        return (
          <div
            key={label}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderRadius: 6,
              padding: "13px 14px",
              fontFamily: fontSans,
              fontSize: 17,
              fontWeight: 500,
              color: active ? atlas.ink : atlas.muted,
              background: active ? atlas.secondary : "transparent",
              border: `1px solid ${active ? atlas.border : "transparent"}`,
            }}
          >
            {active && <AiGlow radius={6} intensity={0.9} />}
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: active ? atlas.primary : `${atlas.muted}80`,
              }}
            />
            {label}
          </div>
        );
      })}
    </div>
  );
};

/** A note header sliver: course eyebrow, title, "Ready" pill. */
export const NoteHeader: React.FC<{ width?: number }> = ({ width = 620 }) => (
  <div style={{ ...card, width, padding: "22px 26px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <p
        style={{
          margin: 0,
          fontFamily: fontMono,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: atlas.muted,
        }}
      >
        Biology 1A03 · Lecture 12
      </p>
      <ReadyPill />
    </div>
    <h2
      style={{
        margin: "10px 0 0",
        fontFamily: fontSans,
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: atlas.ink,
      }}
    >
      Photosynthesis &amp; the light reactions
    </h2>
  </div>
);

/** A single stat card (big number). */
export const StatFragment: React.FC<{ value: string; suffix?: string; label: string; width?: number }> = ({
  value,
  suffix,
  label,
  width = 300,
}) => (
  <div style={{ ...card, width, padding: 22, borderRadius: 6 }}>
    <p
      style={{
        margin: 0,
        fontFamily: fontSans,
        fontWeight: 700,
        fontSize: 46,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        color: atlas.ink,
      }}
    >
      {value}
      {suffix && (
        <span style={{ fontSize: 20, fontWeight: 500, color: atlas.muted, marginLeft: 4 }}>{suffix}</span>
      )}
    </p>
    <p style={{ margin: "6px 0 0", fontFamily: fontSans, fontSize: 16, color: atlas.muted }}>{label}</p>
  </div>
);

/** Key-concept bullets. */
export const ConceptList: React.FC<{ width?: number }> = ({ width = 380 }) => (
  <div style={{ ...card, width, padding: 22 }}>
    <h3 style={{ margin: 0, fontFamily: fontSans, fontSize: 16, fontWeight: 600, color: atlas.ink }}>
      Key concepts
    </h3>
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
      {["Thylakoid & stroma", "PSII → PSI electron flow", "ATP synthase"].map((t) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: fontSans, fontSize: 16, color: atlas.muted }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: `${atlas.primary}a6` }} />
          {t}
        </div>
      ))}
    </div>
  </div>
);

export const ReadyPill: React.FC = () => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      borderRadius: 6,
      border: `1px solid ${atlas.primary}4d`,
      background: `${atlas.primary}1a`,
      padding: "6px 11px",
      fontFamily: fontMono,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: atlas.primary,
    }}
  >
    <span style={{ width: 7, height: 7, borderRadius: 999, background: atlas.primary }} />
    Ready
  </span>
);

/** A standalone live waveform tile (the "some animations" tease). */
export const WaveTile: React.FC<{ width?: number }> = ({ width = 360 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...card, width, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ position: "relative", display: "grid", placeItems: "center", width: 11, height: 11 }}>
        <span
          style={{
            position: "absolute",
            width: 11 + (Math.sin(frame / 7) + 1) * 6,
            height: 11 + (Math.sin(frame / 7) + 1) * 6,
            borderRadius: 999,
            background: "#e5484d",
            opacity: 0.3 - (Math.sin(frame / 7) + 1) * 0.1,
          }}
        />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#e5484d" }} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 3, height: 30 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const h = 5 + (Math.sin(frame / 4 + i * 0.7) * 0.5 + 0.5) * 26;
          return <span key={i} style={{ width: 3, height: h, borderRadius: 999, background: `${atlas.ink}66` }} />;
        })}
      </span>
      <span style={{ marginLeft: "auto", fontFamily: fontMono, fontSize: 15, color: atlas.muted, fontVariantNumeric: "tabular-nums" }}>
        47:32
      </span>
    </div>
  );
};

const Spark: React.FC = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill={atlas.primary}>
    <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" />
    <path d="M19 14l.9 2.1 2.1.9-2.1.9L19 20l-.9-2.1-2.1-.9 2.1-.9L19 14z" />
  </svg>
);
