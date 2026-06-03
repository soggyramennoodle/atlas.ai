"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";
import { useRecording } from "./recording-context";

/**
 * Best-effort live transcription panel (§7). Uses the Web Speech API via the
 * recording context. Where unsupported (non-Chromium browsers), shows a clear
 * fallback message — Gemini's transcript is still the source of truth.
 */
export function LiveTranscript() {
  const { liveTranscript, transcriptSupported, phase } = useRecording();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest words in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveTranscript]);

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-background/40 p-4">
      <p className="mb-2 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span
          className={
            phase === "recording"
              ? "size-1.5 animate-pulse rounded-full bg-primary"
              : "size-1.5 rounded-full bg-muted-foreground/40"
          }
        />
        Live transcript
      </p>

      {!transcriptSupported ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <MicOff className="size-5" />
          <p className="text-pretty">
            Live transcript isn&apos;t available in this browser. Your full
            transcript will still be generated from the audio.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto text-sm leading-relaxed text-foreground/85"
        >
          {liveTranscript ? (
            <p className="text-pretty">{liveTranscript}</p>
          ) : (
            <p className="text-muted-foreground">
              {phase === "paused"
                ? "Paused — resume to keep transcribing."
                : "Listening… your words will appear here."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
