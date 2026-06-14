"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useIntroRevealed } from "@/components/landing/intro";

const STORY_IMAGE = "/landing/story-student.jpg";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The hero's 3D-tilting "story" card: two looping slides synchronized with the
 * CSS story progress bars (6s cycle, 3s per slide).
 */
export function StoryCard() {
  const reduce = useReducedMotion();
  const revealed = useIntroRevealed();
  const [slide, setSlide] = useState(0);

  // Slide timer synchronized with the story-fill bars: slide 1 at 3s, then a
  // 6s interval that resets to 0 and flips back to 1 halfway through.
  useEffect(() => {
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
  }, []);

  // 3D tilt: viewport-normalized mouse position fed through springs.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 120, damping: 18, mass: 0.4 });
  const rotateY = useTransform(sx, [-1, 1], [-18, 18]);
  const rotateX = useTransform(sy, [-1, 1], [12, -12]);

  useEffect(() => {
    if (reduce) return;
    function onMove(e: MouseEvent) {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  return (
    <div style={{ marginTop: 48, perspective: 1200 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, delay: revealed ? 0.45 : 0, ease: EASE }}
        style={{
          width: 310,
          height: 455,
          borderRadius: 28,
          background: "#1a1a1a",
          overflow: "hidden",
          position: "relative",
          transformStyle: "preserve-3d",
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={STORY_IMAGE}
          alt="A student studying"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 20%" }}
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
        {/* Inset top highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 28,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />

        {/* Story progress bars */}
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

        {/* Lower dark gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "55%",
            background:
              "linear-gradient(0deg, #040504 20.54%, rgba(29,37,9,0) 100%)",
          }}
        />

        {/* Headline — re-mounts per slide */}
        <motion.h3
          key={slide}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="absolute z-10"
          style={{
            left: 24,
            right: 24,
            bottom: 88,
            color: "#fff",
            fontSize: 38,
            lineHeight: "40px",
            letterSpacing: -0.5,
            margin: 0,
            textShadow: "0 2px 18px rgba(0,0,0,0.35)",
          }}
        >
          {slide === 0 ? (
            <>
              <span className="font-heading font-bold">Capturing</span>
              <br />
              <span className="font-instrument italic font-normal">
                every lecture
              </span>
            </>
          ) : (
            <>
              <span className="font-heading font-bold">Mastering</span>
              <br />
              <span className="font-instrument italic font-normal">
                every subject
              </span>
            </>
          )}
        </motion.h3>

        {/* Bottom row: a live-capture chip + note count, in Atlas's voice. */}
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
          <span
            className="font-heading grid place-items-center"
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 14,
              background: "rgba(20,20,20,0.45)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Notes in 12 sections
          </span>
        </div>
      </motion.div>
    </div>
  );
}
