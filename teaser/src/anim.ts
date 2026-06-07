import { interpolate, spring, Easing } from "remotion";

export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Slow fade-in (cinematic) → use early for the cold open. */
export const slowFade = (frame: number, start: number, dur = 40) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });

/** Fast, snappy fade-in → use as elements land. */
export const snapFade = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

/**
 * A UI panel's "hover in 3D space, then fall flat" entrance. Returns a CSS
 * transform string. `p` (0..1) is the settle progress: at 0 the panel hovers
 * (rotated, pushed back in z, offset); at 1 it's flat and in place.
 */
export const settle3d = (
  p: number,
  opts: {
    fromX?: number;
    fromY?: number;
    fromZ?: number;
    rotX?: number;
    rotY?: number;
    rotZ?: number;
  } = {}
) => {
  const { fromX = 0, fromY = 60, fromZ = -520, rotX = 18, rotY = -22, rotZ = 0 } = opts;
  const e = 1 - p;
  const x = fromX * e;
  const y = fromY * e;
  const z = fromZ * e;
  const rx = rotX * e;
  const ry = rotY * e;
  const rz = rotZ * e;
  return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
};

/** Spring-driven settle progress (snappy, slight overshoot avoided). */
export const settleSpring = (
  frame: number,
  start: number,
  fps: number,
  config = { damping: 18, mass: 0.9, stiffness: 120 }
) =>
  spring({
    frame: frame - start,
    fps,
    config,
    durationInFrames: 40,
  });

/** A gentle perpetual hover (used before/while elements are still floating). */
export const idleHover = (frame: number, amp = 8, period = 90, phase = 0) =>
  Math.sin((frame + phase) / period) * amp;
