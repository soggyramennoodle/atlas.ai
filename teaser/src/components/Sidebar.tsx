import React from "react";
import { atlas } from "../theme";
import { fontSans } from "../fonts";
import { Logo } from "./Logo";
import {
  LayoutDashboard,
  Mic,
  Newspaper,
  Settings,
} from "./icons";

const NAV = [
  { label: "Dashboard", Icon: LayoutDashboard, active: true },
  { label: "Record a lecture", Icon: Mic, active: false },
  { label: "What's new", Icon: Newspaper, active: false },
  { label: "Settings", Icon: Settings, active: false },
];

/** The app sidebar — logo, nav rail with the active pill on Dashboard. */
export const Sidebar: React.FC<{ width?: number; height?: number }> = ({
  width = 256,
  height = 760,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRight: `1px solid ${atlas.border}`,
        background: atlas.card,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 26,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "8px 8px 0" }}>
        <Logo beta markSize={28} fontSize={24} />
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ label, Icon, active }) => (
          <div
            key={label}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderRadius: 4,
              padding: "11px 12px",
              fontFamily: fontSans,
              fontSize: 14.5,
              fontWeight: 500,
              color: active ? atlas.ink : atlas.muted,
              background: active ? atlas.secondary : "transparent",
              border: `1px solid ${active ? atlas.border : "transparent"}`,
            }}
          >
            <Icon size={19} color={active ? atlas.ink : atlas.muted} />
            {label}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            borderRadius: 4,
            border: `1px solid ${atlas.border}`,
            background: atlas.secondary,
            padding: 16,
          }}
        >
          <SparkleDot />
          <p style={{ margin: "10px 0 0", fontFamily: fontSans, fontSize: 14, fontWeight: 500, color: atlas.ink }}>
            Flashcards &amp; quizzes
          </p>
          <p style={{ margin: "4px 0 0", fontFamily: fontSans, fontSize: 12, color: atlas.muted }}>
            Coming soon to turn your notes into active recall.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderRadius: 4,
            border: `1px solid ${atlas.border}`,
            background: atlas.bg,
            padding: 10,
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              borderRadius: 4,
              background: atlas.secondary,
              fontFamily: fontSans,
              fontWeight: 600,
              fontSize: 14,
              color: atlas.ink,
              border: `1px solid ${atlas.border}`,
            }}
          >
            A
          </span>
          <div style={{ lineHeight: 1.3 }}>
            <p style={{ margin: 0, fontFamily: fontSans, fontSize: 13.5, fontWeight: 500, color: atlas.ink }}>
              User
            </p>
            <p style={{ margin: 0, fontFamily: fontSans, fontSize: 12, color: atlas.muted }}>
              you@university.ca
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SparkleDot: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill={atlas.primary}>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4z" />
  </svg>
);
