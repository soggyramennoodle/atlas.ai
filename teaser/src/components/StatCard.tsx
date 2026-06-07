import React from "react";
import { atlas } from "../theme";
import { fontSans } from "../fonts";
import { Mic, Clock, SparklesIcon, Flame } from "./icons";

const ICONS = { mic: Mic, clock: Clock, sparkles: SparklesIcon, flame: Flame };

export type StatKind = keyof typeof ICONS;

/** A dashboard stat card — icon chip, big tabular value, label. */
export const StatCard: React.FC<{
  kind: StatKind;
  value: string;
  suffix?: string;
  label: string;
  width?: number;
}> = ({ kind, value, suffix, label, width }) => {
  const Icon = ICONS[kind];
  return (
    <div
      style={{
        width,
        borderRadius: 4,
        border: `1px solid ${atlas.border}`,
        background: atlas.card,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          borderRadius: 4,
          border: `1px solid ${atlas.border}`,
          background: atlas.bg,
          color: atlas.ink,
        }}
      >
        <Icon size={20} color={atlas.ink} />
      </span>
      <p
        style={{
          margin: "16px 0 0",
          fontFamily: fontSans,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color: atlas.ink,
        }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 16, fontWeight: 500, color: atlas.muted, marginLeft: 4 }}>
            {suffix}
          </span>
        )}
      </p>
      <p style={{ margin: "4px 0 0", fontFamily: fontSans, fontSize: 14, color: atlas.muted }}>
        {label}
      </p>
    </div>
  );
};
