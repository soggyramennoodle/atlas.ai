"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AtlasMark } from "@/components/logo";

const HERO_VIDEO_SRC = "/landing/hero.mp4";
const HERO_POSTER_SRC = "/landing/hero-poster.jpg";
const EASE = [0.22, 1, 0.36, 1] as const;

// The signature Atlas AI gradient — the one colour moment on the otherwise
// monochrome marketing surface (mirrors .processing-glow / AiGlow).
const AI_GRADIENT =
  "conic-gradient(from 0deg, #12a36b, #1ac4c0, #3b82f6, #8b5cf6, #fb6f4c, #ffb22e, #12a36b)";
// A mostly-transparent arc that, rotated, reads as a bright comet orbiting the
// faint full-colour track beneath it.
const AI_COMET =
  "conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(18,163,107,0.0) 205deg, #12a36b 250deg, #1ac4c0 290deg, #3b82f6 320deg, #8b5cf6 348deg, transparent 360deg)";

/**
 * `true` once the landing intro has finished (or was skipped this session).
 * The hero reads this to hold its entrance until the splash lifts, so the two
 * motions hand off cleanly instead of the hero animating behind the cover.
 */
const IntroContext = createContext(false);
export function useIntroRevealed() {
  return useContext(IntroContext);
}

// Atlas mark breathing inside an orbiting multicolour gradient ring + soft halo.
function OrbitLoader({ reduce }: { reduce: boolean }) {
  const spin = reduce
    ? {}
    : { animate: { rotate: 360 }, transition: { duration: 1.6, ease: "linear" as const, repeat: Infinity } };
  return (
    <div className="relative grid size-[132px] place-items-center">
      {/* Soft colour halo */}
      <motion.div
        aria-hidden
        className="absolute size-[128px] rounded-full"
        style={{ background: AI_GRADIENT, filter: "blur(20px)", opacity: 0.45 }}
        animate={reduce ? undefined : { rotate: 360, opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 3.4, ease: "linear", repeat: Infinity }}
      />
      {/* Faint full-colour track */}
      <div
        aria-hidden
        className="intro-ring-mask absolute size-[108px] rounded-full"
        style={{ background: AI_GRADIENT, padding: 3, opacity: 0.16 }}
      />
      {/* Bright orbiting comet */}
      <motion.div
        aria-hidden
        className="intro-ring-mask absolute size-[108px] rounded-full"
        style={{ background: AI_COMET, padding: 3 }}
        {...spin}
      />
      {/* Atlas mark, breathing */}
      <motion.div
        className="relative text-[#0d0d0d]"
        animate={reduce ? undefined : { scale: [1, 1.07, 1] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      >
        <AtlasMark className="size-9" />
      </motion.div>
    </div>
  );
}

function IntroOverlay({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      className="atlas-intro-overlay fixed inset-0 z-[200] grid place-items-center bg-[#fafafa]"
      // initial={false}: render solid on first paint (no fade-in) so it covers
      // the page immediately; only the exit animates.
      initial={false}
      animate={{ opacity: 1 }}
      exit={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, scale: 1.04, filter: "blur(6px)" }
      }
      transition={{ duration: reduce ? 0.3 : 0.7, ease: EASE }}
    >
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { scale: 1.08, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <OrbitLoader reduce={reduce} />
        <span className="text-[12px] font-medium uppercase tracking-[0.22em] text-black/35">
          Atlas
        </span>
      </motion.div>
    </motion.div>
  );
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  // SSR + first client render both start hidden/covered (matches the pre-paint
  // gate script), so there's no hydration mismatch.
  const [revealed, setRevealed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!sessionStorage.getItem("atlas:introSeen");
    } catch {
      /* private mode / blocked storage — just play the intro */
    }
    if (seen) {
      // Already covered this session — the gate script has display:none'd the
      // SSR cover, so just clear it on the next tick (deferred so we're not
      // setting state synchronously inside the effect body).
      const id = window.setTimeout(() => {
        setRevealed(true);
        setShowOverlay(false);
      }, 0);
      return () => window.clearTimeout(id);
    }

    // Hold the page still under the cover.
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    let finished = false;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const minMs = reduce ? 250 : 650;
    const maxMs = 3500;

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem("atlas:introSeen", "1");
      } catch {
        /* ignore */
      }
      document.documentElement.style.overflow = prevOverflow;
      setRevealed(true); // hero eases in as the cover lifts
      setShowOverlay(false); // cover plays its exit
    };

    const onReady = () => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      window.setTimeout(finish, Math.max(0, minMs - (now - start)));
    };

    // Warm the hero media so it's decoded before the cover lifts — this is what
    // kills the poster→video pop-in.
    const poster = new Image();
    poster.src = HERO_POSTER_SRC;

    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = HERO_VIDEO_SRC;
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onReady, { once: true });
    try {
      video.load();
    } catch {
      onReady();
    }

    const maxId = window.setTimeout(finish, maxMs);
    return () => {
      window.clearTimeout(maxId);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [reduce]);

  return (
    <IntroContext.Provider value={revealed}>
      {children}
      <AnimatePresence>
        {showOverlay && <IntroOverlay key="intro" reduce={reduce} />}
      </AnimatePresence>
    </IntroContext.Provider>
  );
}
