import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { Backdrop, Grain } from "../components/Backdrop";
import { Sidebar } from "../components/Sidebar";
import { StatCard } from "../components/StatCard";
import { NotePreviewCard } from "../components/NotePreviewCard";
import { RecordingChip } from "../components/RecordingChip";
import { atlas } from "../theme";
import { fontSans, fontMono } from "../fonts";
import { settle3d, settleSpring, idleHover, snapFade, EASE_OUT } from "../anim";

/**
 * The centerpiece. On the clean white canvas the dashboard's pieces hover in
 * 3D space, each pushed back and rotated in its own direction, then spring
 * snappily down to a flat plane and lock into the real layout. The whole board
 * keeps a slight perspective tilt + idle parallax so it still reads as 3D.
 */
export const SceneAssemble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Board resting pose: settles to a gentle tilt, then breathes.
  const boardP = settleSpring(frame, 0, fps, { damping: 22, mass: 1, stiffness: 70 });
  const boardRotY = interpolate(boardP, [0, 1], [-16, -4]) + idleHover(frame, 1.2, 150);
  const boardRotX = interpolate(boardP, [0, 1], [12, 2]) + idleHover(frame, 0.8, 180, 40);
  const boardScale = interpolate(boardP, [0, 1], [0.86, 1]);
  const boardY = interpolate(frame, [120, 290], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const panel = (
    startFrame: number,
    from: Parameters<typeof settle3d>[1],
    zIndex = 1
  ): React.CSSProperties => {
    const p = settleSpring(frame, startFrame, fps);
    const hover = idleHover(frame, 4, 120, startFrame * 7) * (1 - p);
    return {
      transform: settle3d(p, from) + ` translateY(${hover}px)`,
      opacity: snapFade(frame, startFrame, 8),
      transformStyle: "preserve-3d",
      zIndex,
    };
  };

  return (
    <AbsoluteFill>
      <Backdrop mode="light" />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          perspective: 1700,
        }}
      >
        <div
          style={{
            transform: `translateY(${boardY}px) rotateX(${boardRotX}deg) rotateY(${boardRotY}deg) scale(${boardScale})`,
            transformStyle: "preserve-3d",
            display: "flex",
            gap: 28,
            alignItems: "stretch",
            filter: "drop-shadow(0 50px 90px rgba(0,0,0,0.14))",
          }}
        >
          {/* Sidebar — swings in from the left. */}
          <div style={panel(6, { fromX: -260, fromY: 30, fromZ: -560, rotX: 10, rotY: 34 }, 2)}>
            <Sidebar height={742} />
          </div>

          {/* Main column */}
          <div
            style={{
              width: 1140,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Greeting */}
            <div style={panel(14, { fromX: 60, fromY: -50, fromZ: -420, rotX: -24, rotY: -10 })}>
              <p
                style={{
                  margin: 0,
                  fontFamily: fontMono,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: atlas.muted,
                }}
              >
                Tuesday · your library
              </p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontFamily: fontSans,
                  fontWeight: 700,
                  fontSize: 44,
                  letterSpacing: "-0.03em",
                  color: atlas.ink,
                }}
              >
                Good evening, Abeeb.
              </h1>
            </div>

            {/* Stat cards — cascade down from the back. */}
            <div style={{ display: "flex", gap: 16, transformStyle: "preserve-3d" }}>
              {[
                { kind: "mic" as const, value: "128", label: "Lectures captured" },
                { kind: "clock" as const, value: "94", suffix: "hrs", label: "Hours saved" },
                { kind: "sparkles" as const, value: "1.2", suffix: "k", label: "Notes written" },
                { kind: "flame" as const, value: "23", label: "Day streak" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    ...panel(22 + i * 5, {
                      fromX: (i - 1.5) * 50,
                      fromY: -80,
                      fromZ: -480 - i * 40,
                      rotX: -30,
                      rotY: -14 + i * 8,
                    }),
                  }}
                >
                  <StatCard {...s} />
                </div>
              ))}
            </div>

            {/* Note preview — the hero surface, arrives from the front + below. */}
            <div
              style={{
                position: "relative",
                marginTop: 6,
                ...panel(30, { fromX: -40, fromY: 120, fromZ: -360, rotX: 26, rotY: -16 }, 3),
              }}
            >
              <div style={{ position: "absolute", top: -18, left: 26, zIndex: 5 }}>
                <RecordingChip />
              </div>
              <NotePreviewCard width={1140} reveal={snapFade(frame, 70, 40)} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Grain opacity={0.03} />
    </AbsoluteFill>
  );
};
