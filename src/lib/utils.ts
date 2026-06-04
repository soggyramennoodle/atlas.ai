import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Whether this device can capture another tab/app's audio for a "virtual"
 * lecture. Capturing device audio relies on `getDisplayMedia` (screen-share),
 * which mobile browsers either don't implement or expose without working audio
 * capture — so virtual lectures are a computer-only feature. Client-only:
 * returns `false` during SSR where `navigator` is undefined.
 */
export function canCaptureDeviceAudio(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") return false;
  // iPadOS reports a desktop UA but still lacks getDisplayMedia, so the feature
  // check above already covers it; this UA test keeps phones/tablets out even
  // where a non-functional stub is exposed.
  const ua = navigator.userAgent || "";
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(
      ua
    );
  return !isMobile;
}
