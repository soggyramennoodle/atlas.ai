import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Why virtual (device-audio) lecture capture is or isn't available here:
 * - "ok":      a Chromium desktop browser that can capture tab/system audio.
 * - "mobile":  a phone/tablet — `getDisplayMedia` is missing or audio-less.
 * - "browser": a desktop browser (Safari, Firefox) that exposes
 *              `getDisplayMedia` but NEVER returns an audio track, so virtual
 *              lectures physically can't work. Safari has no "Share audio"
 *              option at all; Firefox ignores the audio constraint.
 *
 * Client-only: returns "mobile" (disabled) during SSR where `navigator` is
 * undefined.
 */
export type DeviceAudioSupport = "ok" | "mobile" | "browser";

export function deviceAudioSupport(): DeviceAudioSupport {
  if (typeof navigator === "undefined") return "mobile";
  if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") return "mobile";

  const ua = navigator.userAgent || "";
  // iPadOS reports a desktop UA but still lacks working display audio, and the
  // feature check above already covers most of mobile; this keeps the rest out.
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(
      ua
    );
  if (isMobile) return "mobile";

  // Only Chromium-based desktop browsers (Chrome, Edge, Opera, Brave, …) return
  // an audio track from getDisplayMedia. Safari and Firefox expose the API but
  // give video only, so virtual capture always fails there — gate it out.
  const isChromium = /Chrome|Chromium|CriOS|Edg|OPR/i.test(ua);
  return isChromium ? "ok" : "browser";
}

/**
 * Convenience boolean: whether device audio can actually be captured here.
 */
export function canCaptureDeviceAudio(): boolean {
  return deviceAudioSupport() === "ok";
}
