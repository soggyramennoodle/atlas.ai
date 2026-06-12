"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRecording } from "./recording-context";

/**
 * The breathing light ribbon (cinematic waveform). A single continuous line
 * drawn on canvas: it swells with the voice and carries a soft glow bloom
 * under the core stroke, instead of the default-recorder bar meter.
 *
 * Perf contract matches the old Waveform: the audio meter feeds a ref (no
 * React state per frame) and a rAF loop lerps the drawn curve toward the
 * latest levels, so motion is smooth and the React tree never re-renders.
 * Under reduced motion the idle travelling phase is dropped — the ribbon
 * still reflects live audio (it is a meter), it just stops "breathing".
 */
export function WaveRibbon({
  paused = false,
  tone = "ink",
  className,
  /** 0–1 master amplitude multiplier. */
  gain = 1,
}: {
  paused?: boolean;
  /** "ink" for light surfaces, "light" for the dark glass dock. */
  tone?: "ink" | "light";
  className?: string;
  gain?: number;
}) {
  const { subscribeMeter, getLevels } = useRecording();
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    levelsRef.current = getLevels();
    const unsubscribe = subscribeMeter((levels) => {
      levelsRef.current = levels;
    });

    const POINTS = 64;
    const smooth = new Float32Array(POINTS);
    let raf = 0;
    let t = 0;

    /** Resample the meter's level array onto our fixed point count. */
    const levelAt = (i: number) => {
      const src = levelsRef.current;
      if (!src.length) return 0;
      const pos = (i / (POINTS - 1)) * (src.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.min(src.length - 1, lo + 1);
      const f = pos - lo;
      return (src[lo] ?? 0) * (1 - f) + (src[hi] ?? 0) * f;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.045;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      const amp = (h / 2 - 3 * dpr) * gain;

      // Lerp toward live levels; a touch of travelling phase keeps the ribbon
      // breathing between syllables (dropped under reduced motion).
      for (let i = 0; i < POINTS; i++) {
        const edge = Math.sin((i / (POINTS - 1)) * Math.PI); // taper at ends
        const breathe = reduceMotion
          ? 0
          : 0.04 * Math.sin(t * 1.4 + i * 0.55) * edge;
        const target = (levelAt(i) * edge + breathe) * amp;
        smooth[i] += (target - smooth[i]) * 0.22;
      }

      const isPaused = pausedRef.current;
      const core = isPaused
        ? "rgba(217,119,6,0.95)" // amber-600
        : tone === "ink"
          ? "rgba(13,13,13,0.9)"
          : "rgba(255,255,255,0.92)";
      const bloom = isPaused
        ? "rgba(245,158,11,0.45)"
        : tone === "ink"
          ? "rgba(13,13,13,0.28)"
          : "rgba(255,255,255,0.5)";

      const trace = () => {
        ctx.beginPath();
        for (let i = 0; i < POINTS; i++) {
          const x = (i / (POINTS - 1)) * w;
          // Alternate the displacement so the line reads as a wave, not a hump.
          const y = mid + smooth[i] * (i % 2 === 0 ? -1 : 1);
          if (i === 0) ctx.moveTo(x, y);
          else {
            const px = ((i - 1) / (POINTS - 1)) * w;
            const py = mid + smooth[i - 1] * ((i - 1) % 2 === 0 ? -1 : 1);
            ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
          }
        }
        ctx.stroke();
      };

      // Layered strokes fake the glow bloom. Canvas shadowBlur is deliberately
      // avoided: it re-renders a gaussian every frame and tanks low-end GPUs.
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = bloom;
      ctx.lineWidth = 12 * dpr;
      ctx.globalAlpha = 0.35;
      trace();
      ctx.lineWidth = 6 * dpr;
      ctx.globalAlpha = 0.65;
      trace();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = core;
      ctx.lineWidth = 1.6 * dpr;
      trace();
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubscribe();
    };
  }, [subscribeMeter, getLevels, tone, gain, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block h-full w-full", className)}
    />
  );
}
