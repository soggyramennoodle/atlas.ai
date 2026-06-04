"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { useRecording } from "./recording-context";

/**
 * Audio level meter, driven imperatively (§perf). The meter updates ~14×/s;
 * routing that through React state re-rendered the whole recorder tree every
 * frame and starved the compositor. Instead we subscribe to the meter and write
 * `transform: scaleY()` straight to each bar's DOM node — no React render per
 * frame. `transform` is intentionally NOT set via the JSX `style` prop so React
 * never clobbers the value we write here on an unrelated re-render; the initial
 * value is seeded in the ref callback before first paint.
 */
export function Waveform({
  count,
  containerClassName,
  barClassName,
  minScale = 0.08,
  scaleMul = 0.9,
  baseScale = 0.04,
  style,
}: {
  count: number;
  containerClassName?: string;
  barClassName?: string;
  minScale?: number;
  scaleMul?: number;
  baseScale?: number;
  style?: CSSProperties;
}) {
  const { subscribeMeter, getLevels } = useRecording();
  const reduceMotion = useReducedMotion();
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const apply = (levels: number[]) => {
      for (let i = 0; i < count; i++) {
        const el = refs.current[i];
        if (!el) continue;
        const v = Math.max(minScale, (levels[i] ?? baseScale) * scaleMul);
        el.style.transform = `scaleY(${v})`;
      }
    };
    apply(getLevels());
    return subscribeMeter(apply);
  }, [subscribeMeter, getLevels, count, minScale, scaleMul, baseScale]);

  return (
    <div className={containerClassName}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
            if (el) el.style.transform = `scaleY(${baseScale})`;
          }}
          className={barClassName}
          style={{
            ...style,
            transition: reduceMotion
              ? undefined
              : "transform 0.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      ))}
    </div>
  );
}
