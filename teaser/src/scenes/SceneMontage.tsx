import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Backdrop } from "../components/Backdrop";
import {
  GlowSummary,
  NoteHeader,
  StatFragment,
  ConceptList,
  WaveTile,
  NavFragment,
} from "../components/Fragments";
import { KineticWords, TrackingIn, MaskWipe } from "../components/KineticText";
import { fontSans } from "../fonts";
import { EASE_OUT } from "../anim";

const BEAT = 56;
export const MONTAGE_DURATION = BEAT * 3;

/** Ambient depth: big glass cards drifting diagonally behind everything. */
const DriftField: React.FC = () => {
  const frame = useCurrentFrame();
  const cards: { x: number; y: number; vx: number; vy: number; rot: number; el: React.ReactNode; o: number }[] = [
    { x: -160, y: 120, vx: 0.25, vy: 0.12, rot: -8, o: 0.14, el: <NoteHeader width={820} /> },
    { x: 720, y: 360, vx: -0.18, vy: 0.1, rot: 7, o: 0.13, el: <ConceptList width={520} /> },
    { x: -120, y: 1180, vx: 0.2, vy: -0.14, rot: 5, o: 0.13, el: <StatFragment value="128" label="Lectures" width={460} /> },
    { x: 640, y: 1420, vx: -0.22, vy: -0.1, rot: -6, o: 0.12, el: <NavFragment width={520} /> },
  ];
  return (
    <AbsoluteFill>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x + frame * c.vx,
            top: c.y + frame * c.vy,
            transform: `rotate(${c.rot}deg)`,
            opacity: c.o,
            filter: "blur(1.5px) saturate(1.1)",
          }}
        >
          {c.el}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** A hero element that punches in (scale + 3D tilt) and pushes out. */
const Hero: React.FC<{ children: React.ReactNode; tilt?: number }> = ({ children, tilt = 12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 15, mass: 0.8, stiffness: 140 } });
  const scale = interpolate(inP, [0, 1], [0.78, 1]);
  const ry = interpolate(inP, [0, 1], [tilt, 0]);
  const y = interpolate(inP, [0, 1], [70, 0]);
  const out = interpolate(frame, [BEAT - 12, BEAT], [1, 0], { extrapolateLeft: "clamp" });
  const outScale = interpolate(frame, [BEAT - 12, BEAT], [1, 1.08], { extrapolateLeft: "clamp", easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1200 }}>
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `scale(${scale * outScale}) rotateY(${ry}deg) translateY(${y}px)`,
          opacity: Math.min(interpolate(inP, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }), out),
          filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.55))",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/**
 * The high-energy middle. On the night canvas the glass UI and the AI glow pop;
 * big hero elements punch through a drifting field of cards, each beat stamped
 * with bold kinetic typography. Lots happening — fast, but smooth.
 */
export const SceneMontage: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop mode="dark" drift />
      <DriftField />

      {/* Beat 1 — Record */}
      <Sequence from={0} durationInFrames={BEAT}>
        <Hero tilt={14}>
          <div style={{ transform: "scale(1.6)" }}>
            <WaveTile width={640} />
          </div>
        </Hero>
        <WordOverlay>
          <TrackingIn text="RECORD" fontFamily={fontSans} fontSize={150} weight={800} color="#fff" />
        </WordOverlay>
      </Sequence>

      {/* Beat 2 — We listen (glow hero) */}
      <Sequence from={BEAT} durationInFrames={BEAT}>
        <Hero tilt={-12}>
          <div style={{ transform: "scale(1.18)" }}>
            <GlowSummary width={860} />
          </div>
        </Hero>
        <WordOverlay top>
          <KineticWords text="WE LISTEN" fontFamily={fontSans} fontSize={140} weight={800} gradient />
        </WordOverlay>
      </Sequence>

      {/* Beat 3 — Remember everything */}
      <Sequence from={BEAT * 2} durationInFrames={BEAT}>
        <Cluster />
        <WordOverlay>
          <MaskWipe duration={16}>
            <KineticWords text="REMEMBER EVERYTHING" fontFamily={fontSans} fontSize={104} weight={800} color="#fff" stagger={4} />
          </MaskWipe>
        </WordOverlay>
      </Sequence>
    </AbsoluteFill>
  );
};

/** Several cards rush together into a brief overlapping cluster. */
const Cluster: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 17, mass: 0.9, stiffness: 120 } });
  const out = interpolate(frame, [BEAT - 12, BEAT], [1, 0], { extrapolateLeft: "clamp" });
  const pieces = [
    { fromX: -700, fromY: -200, x: -260, y: -360, rot: -6, el: <NoteHeader width={760} /> },
    { fromX: 700, fromY: 0, x: 60, y: 40, rot: 5, el: <GlowSummary width={680} /> },
    { fromX: -500, fromY: 500, x: -300, y: 360, rot: -4, el: <StatFragment value="1.2" suffix="k" label="Notes written" width={420} /> },
    { fromX: 600, fromY: 520, x: 180, y: 520, rot: 7, el: <ConceptList width={460} /> },
  ];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", perspective: 1200 }}>
      {pieces.map((pc, i) => {
        const x = interpolate(p, [0, 1], [pc.fromX, pc.x]);
        const y = interpolate(p, [0, 1], [pc.fromY, pc.y]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              transform: `translate(${x}px, ${y}px) rotate(${pc.rot}deg) scale(${0.9 + p * 0.1})`,
              opacity: Math.min(interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }), out),
              filter: "drop-shadow(0 36px 70px rgba(0,0,0,0.5))",
            }}
          >
            {pc.el}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const WordOverlay: React.FC<{ children: React.ReactNode; top?: boolean }> = ({ children, top }) => (
  <AbsoluteFill
    style={{
      justifyContent: top ? "flex-start" : "flex-end",
      alignItems: "center",
      padding: top ? "300px 60px 0" : "0 60px 320px",
      pointerEvents: "none",
    }}
  >
    <div style={{ textShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>{children}</div>
  </AbsoluteFill>
);
