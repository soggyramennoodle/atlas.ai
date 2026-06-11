"use client";

import { useEffect, useRef } from "react";

const VIDEO_SRC = "/landing/hero.mp4";
const POSTER_SRC = "/landing/hero-poster.jpg";

/**
 * Ambient cinematic background loop for the hero. Muted/inline flags are also
 * set imperatively so iOS Safari reliably autoplays.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    video.play().catch(() => console.warn("Video play blocked"));
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 z-0 h-full w-full object-cover"
      src={VIDEO_SRC}
      poster={POSTER_SRC}
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
