"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PANEL_IMAGE = "/auth/story-login.jpg";
const EASE = [0.22, 1, 0.36, 1] as const;

/* Brand-voice slides only — never user data or invented numbers. */
const SLIDES = [
  { lead: "Capturing", accent: "every lecture" },
  { lead: "Mastering", accent: "every subject" },
] as const;

/**
 * The auth stage's cinematic media panel: the landing StoryCard language at
 * panel scale. Desktop shows story bars + two rotating brand slides + the
 * "Atlas is listening" chip; `compact` is the mobile banner — one static
 * slide, no carousel furniture.
 */
export function AuthStoryPanel({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);

  // Slide timer synchronized with the story-fill bars (desktop only).
  useEffect(() => {
    if (compact || reduce) return;
    const first = setTimeout(() => setSlide(1), 3000);
    let half: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setSlide(0);
      half = setTimeout(() => setSlide(1), 3000);
    }, 6000);
    return () => {
      clearTimeout(first);
      clearTimeout(half);
      clearInterval(cycle);
    };
  }, [compact, reduce]);

  const active = SLIDES[compact ? 0 : slide];

  return (
    <div
      className={
        compact
          ? "relative h-40 w-full overflow-hidden rounded-[20px] bg-[#1a1a1a]"
          : "relative h-full min-h-[520px] w-full overflow-hidden rounded-[24px] bg-[#1a1a1a]"
      }
      style={{
        boxShadow:
          "0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PANEL_IMAGE}
        alt="A student taking notes in a lecture hall"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 30%" }}
      />

      {/* Soft-light green tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          mixBlendMode: "soft-light",
          background:
            "linear-gradient(160deg, rgba(220,255,90,0.65) 0%, rgba(170,230,70,0.35) 40%, rgba(80,140,40,0.25) 100%)",
        }}
      />
      {/* Radial highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 15%, rgba(230,255,120,0.25), transparent 55%)",
        }}
      />
      {/* Lower dark gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: compact ? "75%" : "55%",
          background:
            "linear-gradient(0deg, #040504 20.54%, rgba(29,37,9,0) 100%)",
        }}
      />

      {/* Story progress bars — desktop only */}
      {!compact && (
        <div
          className="absolute z-20 flex"
          style={{ top: 24, left: 24, right: 24, gap: 6 }}
        >
          {["story-bar-1", "story-bar-2"].map((cls) => (
            <div
              key={cls}
              className={cls}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 9999,
                background: "rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                className="story-bar-fill"
                style={{
                  height: "100%",
                  width: "100%",
                  borderRadius: 9999,
                  background: "rgba(0,0,0,0.95)",
                  transform: "scaleX(0)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Headline — re-mounts per slide on desktop, static when compact */}
      <motion.h3
        key={compact ? "static" : slide}
        initial={compact || reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="absolute z-10 text-white"
        style={{
          left: 24,
          right: 24,
          bottom: compact ? 20 : 88,
          fontSize: compact ? 26 : 38,
          lineHeight: compact ? "27px" : "40px",
          letterSpacing: -0.5,
          margin: 0,
          textShadow: "0 2px 18px rgba(0,0,0,0.35)",
        }}
      >
        <span className="font-heading font-semibold">{active.lead}</span>{" "}
        <span className="font-instrument italic font-normal">
          {active.accent}
        </span>
      </motion.h3>

      {/* Bottom chip — desktop only */}
      {!compact && (
        <div
          className="absolute z-10 flex items-center"
          style={{ left: 24, right: 24, bottom: 24, gap: 10 }}
        >
          <span
            className="font-heading flex items-center"
            style={{
              gap: 8,
              background: "rgba(255,255,255,0.96)",
              color: "#0a0a0a",
              fontSize: 13,
              fontWeight: 500,
              padding: "9px 16px",
              borderRadius: 9999,
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#e5484d] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#e5484d]" />
            </span>
            Atlas is listening
          </span>
        </div>
      )}
    </div>
  );
}
