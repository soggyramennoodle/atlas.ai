"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  baseMimeType,
  extForMime,
  uploadLectureAndGenerate,
  MAX_BYTES,
  type CaptureStage,
} from "@/lib/upload-lecture";

export const BARS = 40;
const IDLE_LEVELS = () => Array(BARS).fill(0.04) as number[];

export type RecordingPhase = "idle" | "recording" | "paused" | "recorded";

interface Clip {
  url: string;
  blob: Blob;
  mime: string;
}

interface RecordingValue {
  phase: RecordingPhase;
  seconds: number;
  levels: number[];
  clip: Clip | null;
  stage: CaptureStage;
  busy: boolean;
  /** True after a generation attempt failed — surfaces the "download" escape hatch. */
  failed: boolean;
  /** Live (best-effort) in-browser transcript captured while recording. */
  liveTranscript: string;
  /** Whether the browser supports the Web Speech API live transcription. */
  transcriptSupported: boolean;
  sessionLabel: string;
  setSessionLabel: (label: string) => void;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
  generate: () => Promise<void>;
  /** Save the captured recording to disk (for re-upload after a failed run). */
  download: () => void;
}

const RecordingContext = createContext<RecordingValue | null>(null);

/** Access the global recording session (§8). */
export function useRecording(): RecordingValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}

/** Pick a recording container the browser actually supports. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

// Minimal Web Speech API typing (not in the standard DOM lib).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/**
 * Global recording session provider (§8). Owns the MediaRecorder, level meter,
 * timer, and best-effort live transcription so recording survives navigation
 * between routes in the (app) layout.
 */
export function RecordingProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS);
  const [clip, setClip] = useState<Clip | null>(null);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [sessionLabel, setSessionLabel] = useState("Untitled Lecture");
  const [transcriptSupported, setTranscriptSupported] = useState(false);
  const [failed, setFailed] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef<string>("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const wantTranscriptRef = useRef(false);

  const busy = stage !== "idle";

  useEffect(() => {
    // One-shot, client-only capability check — kept out of render to stay
    // hydration-safe (the server can't know about SpeechRecognition).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranscriptSupported(!!getSpeechRecognition());
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    stopMeter();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    wantTranscriptRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, [stopMeter]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      teardown();
      if (clip) URL.revokeObjectURL(clip.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(buf);
      const next: number[] = [];
      const step = Math.floor(buf.length / BARS) || 1;
      for (let i = 0; i < BARS; i++) {
        next.push(Math.max(0.04, buf[i * step] / 255));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  const startTranscription = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang =
      typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTranscriptRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLiveTranscript((finalTranscriptRef.current + interim).trim());
    };
    // Web Speech stops itself periodically; restart while still wanted.
    recognition.onend = () => {
      if (wantTranscriptRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognition.onerror = () => {};
    recognitionRef.current = recognition;
    wantTranscriptRef.current = true;
    try {
      recognition.start();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(async () => {
    if (busy || phase !== "idle") return;
    const mime = pickMimeType();
    if (typeof MediaRecorder === "undefined" || !mime) {
      toast.error("Your browser can't record audio. Try the file upload instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      toast.error(
        "Microphone access was blocked. Allow it in your browser, or upload a file instead."
      );
      return;
    }

    streamRef.current = stream;
    mimeRef.current = mime;
    chunksRef.current = [];
    finalTranscriptRef.current = "";
    setLiveTranscript("");

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stopMeter();
      const blob = new Blob(chunksRef.current, { type: baseMimeType(mime) });
      if (blob.size > MAX_BYTES) {
        toast.error("That recording is over 100 MB. Try a shorter session.");
        setPhase("idle");
        teardown();
        return;
      }
      const url = URL.createObjectURL(blob);
      setClip({ url, blob, mime: baseMimeType(mime) });
      setPhase("recorded");
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current = rec;
    rec.start();

    setSeconds(0);
    setPhase("recording");
    runMeter();
    startTranscription();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [busy, phase, runMeter, startTranscription, stopMeter, teardown]);

  const pause = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    setPhase("paused");
    stopMeter();
    setLevels(IDLE_LEVELS());
    wantTranscriptRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (tickRef.current) clearInterval(tickRef.current);
  }, [stopMeter]);

  const resume = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    setPhase("recording");
    runMeter();
    if (recognitionRef.current) {
      wantTranscriptRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {
        /* ignore */
      }
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [runMeter]);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    if (tickRef.current) clearInterval(tickRef.current);
    wantTranscriptRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    rec.stop();
  }, []);

  const discard = useCallback(() => {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setSeconds(0);
    setLevels(IDLE_LEVELS());
    setLiveTranscript("");
    setSessionLabel("Untitled Lecture");
    setFailed(false);
    setPhase("idle");
    teardown();
  }, [clip, teardown]);

  const generate = useCallback(async () => {
    if (!clip) return;
    setFailed(false);
    const supabase = createClient();
    try {
      const { id } = await uploadLectureAndGenerate({
        supabase,
        userId,
        data: clip.blob,
        mimeType: clip.mime,
        ext: extForMime(clip.mime),
        durationSeconds: seconds || null,
        liveTranscript: liveTranscript || null,
        onStage: setStage,
      });
      toast.success("Your notes are ready!");
      // Reset session before navigating to the new note.
      URL.revokeObjectURL(clip.url);
      setClip(null);
      setSeconds(0);
      setLevels(IDLE_LEVELS());
      setLiveTranscript("");
      setSessionLabel("Untitled Lecture");
      setPhase("idle");
      setStage("idle");
      router.push(`/notes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
      // Keep the clip around (phase stays "recorded") and offer a download so
      // the student can save the audio and re-upload it later.
      setFailed(true);
    }
  }, [clip, liveTranscript, router, seconds, userId]);

  const download = useCallback(() => {
    if (!clip) return;
    const safeLabel =
      sessionLabel.trim().replace(/[^\w\d\- ]+/g, "").replace(/\s+/g, "-") ||
      "lecture";
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = `${safeLabel}-${stamp}.${extForMime(clip.mime)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [clip, sessionLabel]);

  const value: RecordingValue = {
    phase,
    seconds,
    levels,
    clip,
    stage,
    busy,
    failed,
    liveTranscript,
    transcriptSupported,
    sessionLabel,
    setSessionLabel,
    start,
    pause,
    resume,
    stop,
    discard,
    generate,
    download,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}
