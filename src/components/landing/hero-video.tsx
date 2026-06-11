"use client";

import { useEffect, useRef } from "react";

/* PLACEHOLDER ASSET — swap for the final Atlas ambient study/campus loop
   before launch (same attributes and object-fit so the layout doesn't shift).
   An HLS (.m3u8) source can be wired through Safari's native support; the
   current placeholder is a plain MP4 so no hls.js dependency is needed. */
const VIDEO_SRC =
  "https://videos.pexels.com/video-files/853870/853870-hd_1920_1080_25fps.mp4";
const POSTER_SRC =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=70";

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
