export const SILENCE_PEAK_THRESHOLD = 0.075;
export const SILENCE_MIN_ACTIVE_MS = 500;
export const SILENCE_MIN_DURATION_SECONDS = 2;

/**
 * Client-side silence gate for mic recordings. Virtual (tab-share) lectures skip
 * this — the Atlas tab is usually backgrounded while the lecture plays, so the
 * live meter often reads zero even when the captured file has plenty of audio.
 * Gemini decides whether device captures are usable.
 */
export function isMicRecordingSilent(args: {
  source: "microphone" | "device";
  seconds: number;
  audioPeak: number;
  activeAudioMs: number;
  liveTranscript: string;
}): boolean {
  if (args.source === "device") return false;
  return (
    args.seconds >= SILENCE_MIN_DURATION_SECONDS &&
    args.audioPeak < SILENCE_PEAK_THRESHOLD &&
    args.activeAudioMs < SILENCE_MIN_ACTIVE_MS &&
    !args.liveTranscript.trim()
  );
}
