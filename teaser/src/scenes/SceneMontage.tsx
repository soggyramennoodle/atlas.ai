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
import { LineReveal } from "../components/KineticText";
import { fontSans } from "../fonts";
import { EASE_OUT } from "../anim";

const BEAT = 56;
export const MONTAGE_DURATION = BEAT * 3;

// Clear bands: hero UI sits in the upper-middle, the word in a lower band —
// close enough to read as one composition, never overlapping, and both kept
// out of the Reel's top/bottom safe zones.
const HERO_Y = 720;
const WORD_Y = 1330;

/** Ambient depth: glass cards drifting in the corners, well clear of the text. */
const DriftField: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    { x: -260, y: 70, vx: 0.22, vy: 0.08, rot: -9, o: 0.1, el: <NoteHeader width={760} /> },
    { x: 760, y: 300, vx: -0.16, vy: 0.07, rot: 8, o: 0.09, el: <ConceptList width={500} /> },
    { x: -220, y: 1480, vx: 0.18, vy: -0.1, rot: 6, o: 0.09, el: <StatFragment value="128" label="Lectures" width={440} /> },
    { x: 720, y: 1640, vx: -0.2, vy: -0.08, rot: -7, o: 0.08, el: <NavFragment width={500} /> },
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
            filter: "blur(3px) saturate(1.1)",
          }}
        >
          {c.el}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** A hero element punching in (scale + slight 3D tilt) within the top band. */
const Hero: React.FC<{ children: React.ReactNode; tilt?: number }> = ({ children, tilt = 12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 16, mass: 0.8, stiffness: 140 } });
  const scale = interpolate(inP, [0, 1], [0.82, 1]);
  const ry = interpolate(inP, [0, 1], [tilt, 0]);
  const out = interpolate(frame, [BEAT - 12, BEAT], [1, 0], { extrapolateLeft: "clamp" });
  const outScale = interpolate(frame, [BEAT - 12, BEAT], [1, 1.06], { extrapolateLeft: "clamp", easing: EASE_OUT });
  return (
    <AbsoluteFill style={{ perspective: 1200 }}>
      <div
        style={{
          position: "absolute",
          top: HERO_Y,
          left: "50%",
          transformStyle: "preserve-3d",
          transform: `translate(-50%, -50%) scale(${scale * outScale}) rotateY(${ry}deg)`,
          opacity: Math.min(interpolate(inP, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }), out),
          filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.55))",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** The word, in its own bottom band, over a soft scrim that lifts it off the UI. */
const WordBand: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: WORD_Y - 260,
        height: 520,
        background: "radial-gradient(ellipse 62% 52% at 50% 50%, rgba(8,8,12,0.9), transparent 72%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: WORD_Y,
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "90%",
        textAlign: "center",
        textShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/**
 * The high-energy middle. On the night canvas the glass UI and the AI glow pop;
 * a big hero element punches through a drifting field of cards each beat, with a
 * bold masked-word caption in its own band below. Lots happening — never
 * colliding.
 */
export const SceneMontage: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop mode="dark" drift />
      <DriftField />

      {/* Beat 1 — Record */}
      <Sequence from={0} durationInFrames={BEAT}>
        <Hero tilt={14}>
          <div style={{ transform: "scale(1.55)" }}>
            <WaveTile width={620} />
          </div>
        </Hero>
        <WordBand>
          <LineReveal text="RECORD" fontFamily={fontSans} fontSize={138} weight={900} color="#fff" />
        </WordBand>
      </Sequence>

      {/* Beat 2 — We listen (glow hero) */}
      <Sequence from={BEAT} durationInFrames={BEAT}>
        <Hero tilt={-12}>
          <div style={{ transform: "scale(1.12)" }}>
            <GlowSummary width={840} />
          </div>
        </Hero>
        <WordBand>
          <LineReveal text="WE LISTEN" fontFamily={fontSans} fontSize={134} weight={900} gradient />
        </WordBand>
      </Sequence>

      {/* Beat 3 — Remember everything */}
      <Sequence from={BEAT * 2} durationInFrames={BEAT}>
        <Cluster />
        <WordBand>
          <LineReveal text="Remember everything" fontFamily={fontSans} fontSize={104} weight={800} color="#fff" stagger={4} />
        </WordBand>
      </Sequence>
    </AbsoluteFill>
  );
};

/** Several cards converge into a compact overlapping cluster in the hero band. */
const Cluster: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 18, mass: 0.9, stiffness: 120 } });
  const out = interpolate(frame, [BEAT - 12, BEAT], [1, 0], { extrapolateLeft: "clamp" });
  // Offsets are relative to the hero band centre, kept compact and above WORD_Y.
  const pieces = [
    { fromX: -680, fromY: -260, x: -210, y: -250, rot: -6, el: <NoteHeader width={680} /> },
    { fromX: 680, fromY: -120, x: 130, y: -30, rot: 5, el: <GlowSummary width={620} /> },
    { fromX: -520, fromY: 360, x: -240, y: 210, rot: -4, el: <StatFragment value="1.2" suffix="k" label="Notes written" width={400} /> },
    { fromX: 600, fromY: 360, x: 170, y: 250, rot: 7, el: <ConceptList width={430} /> },
  ];
  return (
    <AbsoluteFill style={{ perspective: 1200 }}>
      {pieces.map((pc, i) => {
        const x = interpolate(p, [0, 1], [pc.fromX, pc.x]);
        const y = interpolate(p, [0, 1], [pc.fromY, pc.y]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: HERO_Y,
              left: "50%",
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${pc.rot}deg) scale(${0.9 + p * 0.1})`,
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
