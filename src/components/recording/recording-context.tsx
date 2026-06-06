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
import { deviceAudioSupport, type DeviceAudioSupport } from "@/lib/utils";
import {
  baseMimeType,
  extForMime,
  uploadLectureAndGenerate,
  MAX_BYTES,
  type CaptureStage,
} from "@/lib/upload-lecture";
import {
  appendRecordingDraftChunk,
  clearRecordingDraft,
  createRecordingDraft,
  getRecordingDraft,
  updateRecordingDraftMetadata,
  putRecordingSegment,
  markRecordingSegmentUploaded,
  getRecordingSegments,
} from "@/lib/recording-draft";
import { uploadSegment, registerSegment } from "@/lib/segment-upload";

export const BARS = 32;
const IDLE_LEVELS = () => Array(BARS).fill(0.04) as number[];
const METER_FRAME_MS = 72;
const TRANSCRIPT_FRAME_MS = 360;
const SILENCE_PEAK_THRESHOLD = 0.075;
const SILENCE_MIN_ACTIVE_MS = 500;
const SILENCE_MIN_DURATION_SECONDS = 2;
const RECORDING_DRAFT_SLICE_MS = 4_000;
// Independent recording segment length. The MediaRecorder is rotated at this
// interval so each segment is a complete, separately-uploadable WebM. ~5 min
// keeps each segment small (<20MB, inline-friendly for the worker). Override in
// dev to force fast rotation.
const SEGMENT_MS = Number(process.env.NEXT_PUBLIC_ATLAS_SEGMENT_MS) || 300_000;
// Match the server route's `maxDuration` (300s). Gemini 2.5 Pro on a full
// lecture routinely takes several minutes, so the old 2-minute client abort
// killed valid long recordings before the server could ever finish.
const PROCESSING_TIMEOUT_MS = 300_000;

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${Math.round(mb)} MB`;
}

export type RecordingPhase = "idle" | "recording" | "paused" | "recorded";

/**
 * Where the audio comes from (§7):
 * - "microphone": the physical room mic (in-person lecture).
 * - "device": tab/app/system audio captured via screen-share, mixed together
 *   with the mic so spoken questions are also caught (virtual lecture).
 */
export type RecordingSource = "microphone" | "device";

export type ProcessingIssueKind = "silent" | "timeout" | "failed";

export interface ProcessingIssue {
  kind: ProcessingIssueKind;
  title: string;
  message: string;
}

interface Clip {
  requestId: string;
  url: string;
  blob: Blob;
  mime: string;
  silent: boolean;
}

interface RecordingValue {
  phase: RecordingPhase;
  seconds: number;
  /**
   * Subscribe to the audio meter (≈14 Hz) imperatively, so the waveform can
   * update without re-rendering React on every frame. The callback is primed
   * immediately with the current levels; the returned function unsubscribes.
   */
  subscribeMeter: (cb: (levels: number[]) => void) => () => void;
  /** Current meter levels (length {@link BARS}) — for a fresh imperative read. */
  getLevels: () => number[];
  clip: Clip | null;
  stage: CaptureStage;
  busy: boolean;
  processingIssue: ProcessingIssue | null;
  /** True once the server has the recording and it is safe to leave the glow screen. */
  processingSafeToLeave: boolean;
  /** True when the current recorded clip was restored from this device. */
  recoveredDraft: boolean;
  /** Last successful local draft save time, if available. */
  lastSavedAt: number | null;
  /** True after a generation attempt failed — surfaces the "download" escape hatch. */
  failed: boolean;
  /**
   * Subscribe to the visible live transcript imperatively. Transcript interim
   * results can arrive several times a second; keeping them out of provider
   * state prevents the whole recorder from re-rendering while Chrome is already
   * recording and compositing the aura.
   */
  subscribeTranscript: (cb: (text: string) => void) => () => void;
  /** Current live transcript text, used for an immediate subscriber prime. */
  getLiveTranscript: () => string;
  /** Whether the browser supports the Web Speech API live transcription. */
  transcriptSupported: boolean;
  /**
   * Whether this device can capture another tab/app's audio (virtual lectures).
   * False on phones/tablets and on Safari/Firefox, where screen-share audio
   * capture isn't available.
   */
  deviceCaptureSupported: boolean;
  /** Why device capture is unavailable, so the UI can show honest guidance. */
  deviceCaptureSupport: DeviceAudioSupport;
  /** Audio source of the active (or most recent) session. */
  source: RecordingSource;
  /**
   * Whether a live transcript is being captured for this session. Device-audio
   * sessions don't get one — Web Speech only hears the physical mic — so the UI
   * shows an honest message instead of "Listening…".
   */
  liveTranscriptActive: boolean;
  sessionLabel: string;
  setSessionLabel: (label: string) => void;
  start: (source?: RecordingSource) => Promise<void>;
  /** Continue a recovered take by appending a fresh recording segment. */
  resumeDraft: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
  generate: () => Promise<void>;
  clearProcessingIssue: () => void;
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

/** The name the energy-meter AudioWorklet processor registers under. */
const ENERGY_METER_PROCESSOR = "atlas-energy-meter";

/**
 * Source for an AudioWorklet that measures recording loudness on the audio
 * render thread. Unlike the requestAnimationFrame-driven visual meter (which
 * the browser FREEZES whenever this tab isn't focused — the normal state during
 * a lecture, where you're watching the shared tab or your screen is off), this
 * keeps measuring while the tab is backgrounded. That's what stops a perfectly
 * good recording from being mistaken for silence and blocked before Gemini.
 *
 * It tracks a cumulative peak (raw sample amplitude, 0–1) and the total time the
 * signal sat above the silence floor, posting both roughly every 200ms. The
 * floor matches {@link SILENCE_PEAK_THRESHOLD} so the silence gate keeps the
 * same thresholds whether it's fed by this worklet or the analyser fallback.
 */
const ENERGY_METER_SOURCE = `
class AtlasEnergyMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.maxPeak = 0;
    this.activeMs = 0;
    this.sincePostMs = 0;
    this.floor = ${SILENCE_PEAK_THRESHOLD};
  }
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channel = input[0];
      if (channel && channel.length > 0) {
        let blockPeak = 0;
        for (let i = 0; i < channel.length; i++) {
          const amp = channel[i] < 0 ? -channel[i] : channel[i];
          if (amp > blockPeak) blockPeak = amp;
        }
        if (blockPeak > this.maxPeak) this.maxPeak = blockPeak;
        const blockMs = (channel.length / sampleRate) * 1000;
        if (blockPeak >= this.floor) this.activeMs += blockMs;
        this.sincePostMs += blockMs;
        if (this.sincePostMs >= 200) {
          this.sincePostMs = 0;
          this.port.postMessage({ peak: this.maxPeak, activeMs: this.activeMs });
        }
      }
    }
    return true;
  }
}
registerProcessor("${ENERGY_METER_PROCESSOR}", AtlasEnergyMeter);
`;

let energyMeterModuleUrl: string | null = null;
/** Lazily build (and cache) a Blob URL for the energy-meter worklet module. */
function getEnergyMeterModuleUrl(): string {
  if (!energyMeterModuleUrl) {
    energyMeterModuleUrl = URL.createObjectURL(
      new Blob([ENERGY_METER_SOURCE], { type: "text/javascript" })
    );
  }
  return energyMeterModuleUrl;
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
  const [clip, setClip] = useState<Clip | null>(null);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [processingIssue, setProcessingIssue] = useState<ProcessingIssue | null>(null);
  const [processingSafeToLeave, setProcessingSafeToLeave] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("Untitled Lecture");
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [transcriptSupported, setTranscriptSupported] = useState(false);
  const [deviceCaptureSupported, setDeviceCaptureSupported] = useState(true);
  const [deviceCaptureSupport, setDeviceCaptureSupport] =
    useState<DeviceAudioSupport>("ok");
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<RecordingSource>("microphone");
  const [liveTranscriptActive, setLiveTranscriptActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /**
   * Raw source streams (mic + display capture) behind a mixed recording. The
   * MediaRecorder records a derived destination stream, so these are tracked
   * separately to make sure every underlying track is stopped on teardown.
   */
  const sourceStreamsRef = useRef<MediaStream[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const mimeRef = useRef<string>("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const wantTranscriptRef = useRef(false);
  const lastMeterAtRef = useRef(0);
  const lastTranscriptAtRef = useRef(0);
  const pendingTranscriptRef = useRef("");
  const transcriptFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptKickoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPeakRef = useRef(0);
  const activeAudioMsRef = useRef(0);
  // Background-safe loudness measurement (see ENERGY_METER_SOURCE). When the
  // worklet is running it owns audioPeakRef/activeAudioMsRef; the rAF meter then
  // only drives the visual waveform.
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const silenceSinkRef = useRef<GainNode | null>(null);
  const workletEnergyRef = useRef(false);
  const generationRunRef = useRef(0);
  const draftWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const requestIdRef = useRef<string>(crypto.randomUUID());
  // Lets the display-capture "ended" listener call the latest stop() without
  // start() having to depend on it (avoids a circular useCallback reference).
  const stopRef = useRef<(() => void) | null>(null);

  // Segmented recording (durable server-side processing). A lecture is recorded
  // as a sequence of independent ~5-min WebM segments, each uploaded to R2 as it
  // finishes. The capture pipeline (AudioContext/analyser/worklet/recognition/
  // tick) is NOT touched between segments — only the MediaRecorder is rotated.
  const jobIdRef = useRef<string>(crypto.randomUUID());
  const segmentIndexRef = useRef(0);
  const enqueuedRef = useRef(false);
  const rotatingRef = useRef(false); // true => current onstop is a rotation, not a user stop
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSourceRef = useRef<RecordingSource>("microphone");
  // Lets onstop start the next segment without startSegmentRecorder referencing
  // itself during its own definition (avoids a use-before-init closure).
  const startSegmentRecorderRef = useRef<(() => MediaRecorder) | null>(null);
  const armRotationRef = useRef<(() => void) | null>(null);

  // Audio meter is published imperatively, never through React state — see
  // components/recording/waveform.tsx. `levelsRef` holds the latest frame and
  // `meterListenersRef` the subscribed waveform updaters.
  const levelsRef = useRef<number[]>(IDLE_LEVELS());
  const meterListenersRef = useRef<Set<(levels: number[]) => void>>(new Set());
  const transcriptListenersRef = useRef<Set<(text: string) => void>>(new Set());
  const emitLevels = useCallback((next: number[]) => {
    levelsRef.current = next;
    meterListenersRef.current.forEach((cb) => cb(next));
  }, []);
  const subscribeMeter = useCallback((cb: (levels: number[]) => void) => {
    meterListenersRef.current.add(cb);
    cb(levelsRef.current);
    return () => {
      meterListenersRef.current.delete(cb);
    };
  }, []);
  const getLevels = useCallback(() => levelsRef.current, []);
  const emitTranscript = useCallback((next: string) => {
    liveTranscriptRef.current = next;
    transcriptListenersRef.current.forEach((cb) => cb(next));
  }, []);
  const subscribeTranscript = useCallback((cb: (text: string) => void) => {
    transcriptListenersRef.current.add(cb);
    cb(liveTranscriptRef.current);
    return () => {
      transcriptListenersRef.current.delete(cb);
    };
  }, []);
  const getLiveTranscript = useCallback(() => liveTranscriptRef.current, []);

  const busy = stage !== "idle";

  const enqueueDraftWrite = useCallback((write: () => Promise<void>) => {
    draftWriteQueueRef.current = draftWriteQueueRef.current
      .catch(() => {})
      .then(write)
      .catch((err) => {
        console.warn("Recording draft write failed:", err);
      });
    return draftWriteQueueRef.current;
  }, []);

  const draftPatch = useCallback(
    () => ({
      seconds: secondsRef.current,
      liveTranscript: liveTranscriptRef.current,
      audioPeak: audioPeakRef.current,
      activeAudioMs: activeAudioMsRef.current,
      sessionLabel,
      source,
      mime: baseMimeType(mimeRef.current || "audio/webm"),
    }),
    [sessionLabel, source]
  );

  const saveDraftMetadata = useCallback(() => {
    if (!mimeRef.current) return;
    const queuedAt = Date.now();
    setLastSavedAt(queuedAt);
    void enqueueDraftWrite(() =>
      updateRecordingDraftMetadata(userId, draftPatch()).then(() => {
        setLastSavedAt(Date.now());
      })
    );
  }, [draftPatch, enqueueDraftWrite, userId]);

  useEffect(() => {
    // One-shot, client-only capability check — kept out of render to stay
    // hydration-safe (the server can't know about SpeechRecognition).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranscriptSupported(!!getSpeechRecognition());
    // Virtual (device-audio) capture needs getDisplayMedia with a working audio
    // track — absent on mobile and on Safari/Firefox.
    const support = deviceAudioSupport();
    setDeviceCaptureSupport(support);
    setDeviceCaptureSupported(support === "ok");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreDraft() {
      try {
        const draft = await getRecordingDraft(userId);
        if (cancelled || !draft || draft.chunks.length === 0) return;
        if (mediaRecorderRef.current || phase !== "idle" || clip) return;

        const blob = new Blob(draft.chunks, { type: draft.metadata.mime });
        if (blob.size <= 0) {
          await clearRecordingDraft(userId);
          return;
        }
        if (blob.size > MAX_BYTES) {
          await clearRecordingDraft(userId);
          toast.error(
            `A recovered recording was over ${formatBytes(MAX_BYTES)}, so Atlas couldn't keep it.`
          );
          return;
        }

        const transcript = draft.metadata.liveTranscript || "";
        const url = URL.createObjectURL(blob);
        chunksRef.current = [blob];
        mimeRef.current = draft.metadata.mime;
        requestIdRef.current = draft.metadata.requestId;
        // The recovered take's job is keyed by the draft's requestId; mirror it
        // so a resumed segment uploads under the original lecture_jobs row.
        jobIdRef.current = draft.metadata.requestId;
        secondsRef.current = draft.metadata.seconds;
        finalTranscriptRef.current = transcript;
        liveTranscriptRef.current = transcript;
        pendingTranscriptRef.current = transcript;
        audioPeakRef.current = draft.metadata.audioPeak;
        activeAudioMsRef.current = draft.metadata.activeAudioMs;

        setSeconds(draft.metadata.seconds);
        setSource(draft.metadata.source);
        setSessionLabel(draft.metadata.sessionLabel || "Untitled Lecture");
        setLastSavedAt(draft.metadata.updatedAt);
        setRecoveredDraft(true);
        emitTranscript(transcript);
        emitLevels(IDLE_LEVELS());
        setClip({
          requestId: draft.metadata.requestId,
          url,
          blob,
          mime: draft.metadata.mime,
          silent:
            draft.metadata.seconds >= SILENCE_MIN_DURATION_SECONDS &&
            draft.metadata.audioPeak < SILENCE_PEAK_THRESHOLD &&
            draft.metadata.activeAudioMs < SILENCE_MIN_ACTIVE_MS &&
            !transcript.trim(),
        });
        setPhase("recorded");
        toast.message("Recovered a recording saved on this device.");

        // Reconcile durable segments: re-upload any whose upload didn't finish
        // before the tab/device closed. Best-effort — already-uploaded segments
        // live in R2 and need no action. This is what makes recovery durable
        // across devices for everything already pushed server-side.
        const segs = await getRecordingSegments(userId);
        for (const seg of segs) {
          if (seg.uploaded) continue;
          try {
            const r2Key = await uploadSegment({
              blob: seg.blob,
              mime: seg.mime,
              jobId: draft.metadata.requestId,
              segmentIndex: seg.index,
            });
            await registerSegment({
              jobId: draft.metadata.requestId,
              segmentIndex: seg.index,
              r2Key,
              durationSeconds: seg.durationSeconds,
            });
            await markRecordingSegmentUploaded(userId, seg.index);
          } catch {
            /* leave uploaded:false for a later retry */
          }
        }
        // Continue numbering after the recovered segments so a resumed take
        // doesn't collide indices with what's already in the job.
        if (segs.length > 0) {
          segmentIndexRef.current = segs[segs.length - 1].index + 1;
        }
      } catch (err) {
        console.warn("Recording draft restore failed:", err);
      }
    }

    void restoreDraft();
    return () => {
      cancelled = true;
    };
    // Restore only once for the signed-in user, before any new session starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    stopMeter();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = null;
    rotatingRef.current = false;
    if (transcriptFlushRef.current) clearTimeout(transcriptFlushRef.current);
    transcriptFlushRef.current = null;
    if (transcriptKickoffRef.current) clearTimeout(transcriptKickoffRef.current);
    transcriptKickoffRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    sourceStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    sourceStreamsRef.current = [];
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      try {
        workletNodeRef.current.disconnect();
      } catch {
        /* ignore */
      }
    }
    workletNodeRef.current = null;
    if (silenceSinkRef.current) {
      try {
        silenceSinkRef.current.disconnect();
      } catch {
        /* ignore */
      }
    }
    silenceSinkRef.current = null;
    workletEnergyRef.current = false;
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

  const flushTranscript = useCallback((next: string) => {
    pendingTranscriptRef.current = next;
    const now = performance.now();
    const elapsed = now - lastTranscriptAtRef.current;

    if (elapsed >= TRANSCRIPT_FRAME_MS) {
      if (transcriptFlushRef.current) clearTimeout(transcriptFlushRef.current);
      transcriptFlushRef.current = null;
      lastTranscriptAtRef.current = now;
      emitTranscript(next);
      return;
    }

    if (transcriptFlushRef.current) return;
    transcriptFlushRef.current = setTimeout(() => {
      transcriptFlushRef.current = null;
      lastTranscriptAtRef.current = performance.now();
      emitTranscript(pendingTranscriptRef.current);
    }, TRANSCRIPT_FRAME_MS - elapsed);
  }, [emitTranscript]);

  const resetAudioActivity = useCallback(() => {
    audioPeakRef.current = 0;
    activeAudioMsRef.current = 0;
  }, []);

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
      const now = performance.now();
      if (now - lastMeterAtRef.current >= METER_FRAME_MS) {
        lastMeterAtRef.current = now;
        const next: number[] = [];
        const step = Math.floor(buf.length / BARS) || 1;
        let peak = 0;
        for (let i = 0; i < BARS; i++) {
          const level = buf[i * step] / 255;
          peak = Math.max(peak, level);
          next.push(Math.max(0.04, level));
        }
        // Fallback only: when the AudioWorklet meter is running it owns these
        // (and keeps working while backgrounded, which rAF does not).
        if (!workletEnergyRef.current) {
          audioPeakRef.current = Math.max(audioPeakRef.current, peak);
          if (peak >= SILENCE_PEAK_THRESHOLD)
            activeAudioMsRef.current += METER_FRAME_MS;
        }
        emitLevels(next);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [emitLevels]);

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
      flushTranscript((finalTranscriptRef.current + interim).trim());
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
  }, [flushTranscript]);

  // Persist a finished segment locally, then upload it to R2 and register it.
  // Local-first so a failed/offline upload survives for later recovery.
  const finalizeSegment = useCallback(async (blob: Blob) => {
    if (blob.size <= 0) return;
    const index = segmentIndexRef.current;
    segmentIndexRef.current = index + 1;
    const mime = baseMimeType(mimeRef.current || "audio/webm");
    const durationSeconds = secondsRef.current;
    // 1) Persist locally first (survives a failed upload / offline).
    await putRecordingSegment(userId, { index, blob, mime, durationSeconds, uploaded: false }).catch(() => {});
    // 2) Upload to R2 + register. On failure, leave uploaded:false for recovery.
    try {
      const r2Key = await uploadSegment({ blob, mime, jobId: jobIdRef.current, segmentIndex: index });
      await registerSegment({ jobId: jobIdRef.current, segmentIndex: index, r2Key, durationSeconds });
      await markRecordingSegmentUploaded(userId, index);
    } catch (err) {
      console.warn("Segment upload deferred (will retry on recovery):", err);
    }
  }, [userId]);

  const retryPendingSegmentUploads = useCallback(async () => {
    const segments = await getRecordingSegments(userId);
    let failedUpload = false;

    for (const segment of segments) {
      if (segment.uploaded) continue;
      try {
        const r2Key = await uploadSegment({
          blob: segment.blob,
          mime: segment.mime,
          jobId: jobIdRef.current,
          segmentIndex: segment.index,
        });
        await registerSegment({
          jobId: jobIdRef.current,
          segmentIndex: segment.index,
          r2Key,
          durationSeconds: segment.durationSeconds,
        });
        await markRecordingSegmentUploaded(userId, segment.index);
      } catch (err) {
        failedUpload = true;
        console.warn("Segment upload still pending:", err);
      }
    }

    const refreshed = await getRecordingSegments(userId);
    return (
      !failedUpload &&
      refreshed.filter((segment) => segment.uploaded).length >= segmentIndexRef.current
    );
  }, [userId]);

  const restoreClipFromDraft = useCallback(async () => {
    const draft = await getRecordingDraft(userId).catch(() => null);
    if (!draft || draft.chunks.length === 0) return;

    const blob = new Blob(draft.chunks, { type: draft.metadata.mime });
    if (blob.size <= 0) return;

    const url = URL.createObjectURL(blob);
    setClip({
      requestId: draft.metadata.requestId,
      url,
      blob,
      mime: draft.metadata.mime,
      silent:
        draft.metadata.seconds >= SILENCE_MIN_DURATION_SECONDS &&
        draft.metadata.audioPeak < SILENCE_PEAK_THRESHOLD &&
        draft.metadata.activeAudioMs < SILENCE_MIN_ACTIVE_MS &&
        !draft.metadata.liveTranscript.trim(),
    });
    setSeconds(draft.metadata.seconds);
    secondsRef.current = draft.metadata.seconds;
    setPhase("recorded");
  }, [userId]);

  // Mark the job complete server-side and move the UI into the background
  // processing handoff once every local segment is safely uploaded.
  const completeJobAndProcess = useCallback(async () => {
    setStage("analyzing"); // shows the ProcessingOverlay
    setProcessingSafeToLeave(false);
    let noteId: string | null = null;
    try {
      const allSegmentsUploaded = await retryPendingSegmentUploads();
      if (!allSegmentsUploaded) {
        await restoreClipFromDraft();
        setStage("idle");
        setFailed(true);
        setProcessingIssue({
          kind: "failed",
          title: "Atlas couldn't upload everything",
          message:
            "Some audio is still saved on this device but couldn't reach Atlas. Download the recording or try again when your connection is steadier.",
        });
        toast.error("Atlas couldn't upload the full recording.");
        return;
      }

      // Completing the job creates the placeholder note and flips the job to
      // recording_complete so the worker picks it up. It returns the note id.
      const res = await fetch("/api/jobs/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobIdRef.current, segmentCount: segmentIndexRef.current,
          durationSeconds: Math.round(secondsRef.current) || null,
          liveTranscript: liveTranscriptRef.current || null,
        }),
      }).then((r) => r.json()).catch(() => null);
      noteId = res?.noteId ?? null;
    } catch {}
    // Clear local draft now that all segments are server-side.
    void enqueueDraftWrite(() => clearRecordingDraft(userId));
    // Reset session + navigate. The note shows "processing" and flips via Realtime.
    setStage("idle");
    setPhase("idle");
    setSeconds(0); secondsRef.current = 0;
    emitLevels(IDLE_LEVELS()); emitTranscript("");
    setSessionLabel("Untitled Lecture");
    enqueuedRef.current = false; segmentIndexRef.current = 0;
    toast.success("Atlas is generating your notes.");
    setProcessingSafeToLeave(true);
    if (!noteId) router.push("/dashboard");
  }, [
    userId,
    enqueueDraftWrite,
    emitLevels,
    emitTranscript,
    restoreClipFromDraft,
    retryPendingSegmentUploads,
    router,
  ]);

  // (Re)arm the rotation timer while recording. On fire it stops the current
  // MediaRecorder (with rotatingRef set), whose onstop finalizes the segment,
  // starts the next recorder, and re-arms — all without touching the pipeline.
  const armRotation = useCallback(() => {
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === "recording") {
        rotatingRef.current = true;
        try { rec.requestData(); } catch {}
        rec.stop(); // onstop finalizes + starts the next segment + re-arms
      }
    }, SEGMENT_MS);
  }, []);
  useEffect(() => {
    armRotationRef.current = armRotation;
  }, [armRotation]);

  // Build a MediaRecorder with the shared per-segment handlers. Reused on every
  // rotation so a fresh recorder is wired identically WITHOUT tearing down the
  // single capture pipeline. Handlers read mimeRef/currentSourceRef (not closure
  // params) so they stay correct across segments.
  const startSegmentRecorder = useCallback((): MediaRecorder => {
    const rec = new MediaRecorder(streamRef.current!, { mimeType: mimeRef.current });
    rec.ondataavailable = (e) => {
      if (e.data.size <= 0) return;
      chunksRef.current.push(e.data);
      const savedAt = Date.now();
      setLastSavedAt(savedAt);
      void enqueueDraftWrite(() =>
        appendRecordingDraftChunk(userId, e.data, {
          ...draftPatch(),
          source: currentSourceRef.current,
          mime: baseMimeType(mimeRef.current),
        }).then(() => {
          setLastSavedAt(Date.now());
        })
      );
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: baseMimeType(mimeRef.current) });
      if (rotatingRef.current) {
        // Rotation boundary: finalize this segment and immediately begin the
        // next one. Pipeline stays live; no phase change, no clip.
        void finalizeSegment(blob);
        chunksRef.current = [];
        rotatingRef.current = false;
        const nextRec = startSegmentRecorderRef.current!();
        mediaRecorderRef.current = nextRec;
        nextRec.start(RECORDING_DRAFT_SLICE_MS);
        armRotationRef.current?.();
        return;
      }
      // User stop / finish: this is the final segment. Finalize it, then move
      // the UI into processing. Tear down the capture pipeline exactly as the
      // old onstop did.
      stopMeter();
      void finalizeSegment(blob).then(() => completeJobAndProcess());
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      sourceStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      sourceStreamsRef.current = [];
      if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        try {
          workletNodeRef.current.disconnect();
        } catch {
          /* ignore */
        }
      }
      workletNodeRef.current = null;
      if (silenceSinkRef.current) {
        try {
          silenceSinkRef.current.disconnect();
        } catch {
          /* ignore */
        }
      }
      silenceSinkRef.current = null;
      workletEnergyRef.current = false;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      mediaRecorderRef.current = null;
    };
    return rec;
  }, [
    userId,
    draftPatch,
    enqueueDraftWrite,
    finalizeSegment,
    completeJobAndProcess,
    stopMeter,
  ]);
  useEffect(() => {
    startSegmentRecorderRef.current = startSegmentRecorder;
  }, [startSegmentRecorder]);

  const start = useCallback(async (
    nextSource: RecordingSource = "microphone",
    appendToDraft = false
  ) => {
    if (busy || (appendToDraft ? phase !== "recorded" || !clip : phase !== "idle")) {
      return;
    }

    // Virtual lectures capture another tab/app's audio via screen-share. Mobile
    // browsers don't support it, and Safari/Firefox expose the picker but never
    // return an audio track — so bail out early with an honest, browser-specific
    // message instead of letting the share picker fail or silently capture no
    // audio.
    if (nextSource === "device") {
      const support = deviceAudioSupport();
      if (support !== "ok") {
        toast.error(
          support === "browser"
            ? "Virtual lectures need Chrome or Edge — Safari and Firefox can’t capture a tab’s audio. Open Atlas in Chrome to record a lecture playing on your screen."
            : "Recording a virtual lecture is only available on a computer — open Atlas on your laptop or desktop to capture device audio."
        );
        return;
      }
    }

    const mime = pickMimeType();
    if (typeof MediaRecorder === "undefined" || !mime) {
      toast.error("Your browser can't record audio. Try the file upload instead.");
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      toast.error("Your browser can't record audio. Try the file upload instead.");
      return;
    }

    // The raw streams we open (one for mic, optionally one for screen-share),
    // and the stream the MediaRecorder ultimately records.
    const opened: MediaStream[] = [];
    let recordStream: MediaStream;
    let ctx: AudioContext;
    let analyser: AnalyserNode;

    /** Stop everything opened so far — used on any mid-setup failure. */
    const abortSetup = () => {
      opened.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    };

    /**
     * Spin up the background-safe energy meter and return its node so the live
     * source(s) can be connected to it. Called AFTER the capture streams are
     * acquired so the (awaited) module load never eats the user-gesture window
     * that getDisplayMedia/getUserMedia need. Falls back to the rAF analyser
     * (workletEnergyRef stays false) if AudioWorklet is unavailable.
     */
    const ensureEnergyWorklet = async (
      audioCtx: AudioContext
    ): Promise<AudioWorkletNode | null> => {
      workletEnergyRef.current = false;
      // Some browsers leave the context "suspended"; without resuming, neither
      // the worklet nor the analyser would see any audio.
      if (audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => {});
      }
      if (!audioCtx.audioWorklet) return null;
      try {
        await audioCtx.audioWorklet.addModule(getEnergyMeterModuleUrl());
        const node = new AudioWorkletNode(audioCtx, ENERGY_METER_PROCESSOR);
        node.port.onmessage = (ev: MessageEvent) => {
          const data = ev.data as { peak?: number; activeMs?: number };
          if (typeof data?.peak === "number") {
            audioPeakRef.current = Math.max(audioPeakRef.current, data.peak);
          }
          if (typeof data?.activeMs === "number") {
            activeAudioMsRef.current = Math.max(
              activeAudioMsRef.current,
              data.activeMs
            );
          }
        };
        // Route through a muted gain into the destination so the graph keeps
        // rendering (and the worklet keeps running) while backgrounded, without
        // ever playing anything back.
        const sink = audioCtx.createGain();
        sink.gain.value = 0;
        node.connect(sink).connect(audioCtx.destination);
        workletNodeRef.current = node;
        silenceSinkRef.current = sink;
        workletEnergyRef.current = true;
        return node;
      } catch {
        workletNodeRef.current = null;
        silenceSinkRef.current = null;
        workletEnergyRef.current = false;
        return null;
      }
    };

    try {
      ctx = new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;

      if (nextSource === "device") {
        // 1) Capture the tab/app/system audio. getDisplayMedia requires a video
        //    request in most browsers even when we only want the audio, so we
        //    ask for both and discard the video track immediately.
        let display: MediaStream;
        try {
          display = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
        } catch {
          // User dismissed the share picker, or the browser refused.
          await ctx.close().catch(() => {});
          toast.error(
            "Screen share was cancelled. Pick a tab or window and tick “Share audio” to capture a virtual lecture."
          );
          return;
        }
        opened.push(display);
        display.getVideoTracks().forEach((t) => t.stop());

        if (display.getAudioTracks().length === 0) {
          abortSetup();
          await ctx.close().catch(() => {});
          toast.error(
            "No audio came through. Single windows usually can't share audio — re-share a browser tab or your entire screen and tick “Share tab audio” (or system audio) in the dialog."
          );
          return;
        }

        // 2) Also capture the mic so the student's own questions are recorded.
        //    If the mic is blocked we still proceed with device audio alone.
        let mic: MediaStream | null = null;
        try {
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          opened.push(mic);
        } catch {
          toast.message("Recording the lecture audio only — microphone was blocked.");
        }

        // 3) Mix every source into a single destination stream and feed the
        //    analyser from the same graph so the waveform reflects everything.
        const destination = ctx.createMediaStreamDestination();
        const energyNode = await ensureEnergyWorklet(ctx);
        const displaySource = ctx.createMediaStreamSource(display);
        displaySource.connect(destination);
        displaySource.connect(analyser);
        if (energyNode) displaySource.connect(energyNode);
        if (mic) {
          const micSource = ctx.createMediaStreamSource(mic);
          micSource.connect(destination);
          micSource.connect(analyser);
          if (energyNode) micSource.connect(energyNode);
        }
        recordStream = destination.stream;

        // If the user hits the browser's native "Stop sharing" bar, end the take.
        display.getAudioTracks()[0]?.addEventListener("ended", () => {
          if (mediaRecorderRef.current?.state !== "inactive") stopRef.current?.();
        });
      } else {
        // Microphone (in-person) — single stream, recorded directly.
        let mic: MediaStream;
        try {
          mic = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } catch {
          await ctx.close().catch(() => {});
          toast.error(
            "Microphone access was blocked. Allow it in your browser, or upload a file instead."
          );
          return;
        }
        opened.push(mic);
        const energyNode = await ensureEnergyWorklet(ctx);
        const micSource = ctx.createMediaStreamSource(mic);
        micSource.connect(analyser);
        if (energyNode) micSource.connect(energyNode);
        recordStream = mic;
      }
    } catch {
      abortSetup();
      toast.error("Couldn't start recording. Try again or upload a file instead.");
      return;
    }

    streamRef.current = recordStream;
    sourceStreamsRef.current = opened;
    mimeRef.current = mime;
    const existingClip = appendToDraft ? clip : null;
    if (existingClip) {
      URL.revokeObjectURL(existingClip.url);
      chunksRef.current = [existingClip.blob];
    } else {
      chunksRef.current = [];
      finalTranscriptRef.current = "";
      pendingTranscriptRef.current = "";
      lastTranscriptAtRef.current = 0;
      secondsRef.current = 0;
      requestIdRef.current = crypto.randomUUID();
      // New session: fresh job + segment counter; allow a single enqueue.
      // The jobId IS the draft's requestId (the only id persisted in the draft),
      // so segments re-uploaded during recovery after a reload join the SAME
      // lecture_jobs row — the basis of close-tab-and-reopen durability.
      segmentIndexRef.current = 0;
      jobIdRef.current = requestIdRef.current;
      enqueuedRef.current = false;
      emitTranscript("");
      resetAudioActivity();
      void enqueueDraftWrite(() =>
        createRecordingDraft({
          userId,
          requestId: requestIdRef.current,
          mime: baseMimeType(mime),
          source: nextSource,
          sessionLabel,
        }).then(() => {
          setLastSavedAt(Date.now());
        })
      );
    }
    if (existingClip) {
      setClip(null);
      void enqueueDraftWrite(() =>
        updateRecordingDraftMetadata(userId, {
          ...draftPatch(),
          source: nextSource,
          mime: baseMimeType(mime),
        }).then(() => {
          setLastSavedAt(Date.now());
        })
      );
    }
    setProcessingIssue(null);
    setProcessingSafeToLeave(false);
    generationRunRef.current += 1;
    currentSourceRef.current = nextSource;
    setSource(nextSource);
    setRecoveredDraft(false);
    setFailed(false);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    // streamRef.current and mimeRef.current are already set above; the segment
    // recorder reads them. Build + start the first segment recorder.
    mimeRef.current = mime;
    const rec = startSegmentRecorder();
    mediaRecorderRef.current = rec;
    rec.start(RECORDING_DRAFT_SLICE_MS);

    if (!appendToDraft) setSeconds(0);
    setPhase("recording");
    // Enqueue the durable job exactly once per fresh session. Resumed/append
    // takes keep the same jobId so their segments join the existing job.
    if (!appendToDraft && !enqueuedRef.current) {
      enqueuedRef.current = true;
      void fetch("/api/jobs/enqueue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jobIdRef.current, sessionLabel, source: nextSource }),
      }).catch(() => {});
    }
    armRotation();
    runMeter();
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        secondsRef.current = next;
        if (next % 5 === 0) saveDraftMetadata();
        return next;
      });
    }, 1000);
    // Live transcript only runs for mic sessions — Web Speech can't hear the
    // captured device audio, so for "device" we leave it off and say so.
    const wantLiveTranscript = nextSource === "microphone";
    setLiveTranscriptActive(wantLiveTranscript);
    if (wantLiveTranscript) {
      transcriptKickoffRef.current = setTimeout(() => {
        transcriptKickoffRef.current = null;
        if (mediaRecorderRef.current?.state === "recording") startTranscription();
      }, 180);
    }
  }, [
    busy,
    clip,
    draftPatch,
    enqueueDraftWrite,
    phase,
    emitTranscript,
    resetAudioActivity,
    runMeter,
    saveDraftMetadata,
    startTranscription,
    startSegmentRecorder,
    armRotation,
    sessionLabel,
    userId,
  ]);

  const pause = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    try {
      rec.requestData();
    } catch {
      /* ignore */
    }
    rec.pause();
    setPhase("paused");
    stopMeter();
    // Don't rotate while paused — a paused recorder can't be cleanly rotated.
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = null;
    if (transcriptKickoffRef.current) clearTimeout(transcriptKickoffRef.current);
    transcriptKickoffRef.current = null;
    emitLevels(IDLE_LEVELS());
    wantTranscriptRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (tickRef.current) clearInterval(tickRef.current);
    saveDraftMetadata();
  }, [stopMeter, emitLevels, saveDraftMetadata]);

  const resume = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    setPhase("recording");
    runMeter();
    armRotation(); // resume rotation from a full segment interval
    if (recognitionRef.current) {
      wantTranscriptRef.current = true;
      try {
        recognitionRef.current.start();
      } catch {
        /* ignore */
      }
    }
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        secondsRef.current = next;
        if (next % 5 === 0) saveDraftMetadata();
        return next;
      });
    }, 1000);
  }, [runMeter, saveDraftMetadata, armRotation]);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (transcriptKickoffRef.current) clearTimeout(transcriptKickoffRef.current);
    transcriptKickoffRef.current = null;
    // Cancel any pending rotation and make sure onstop takes the user-stop
    // (final segment) branch rather than the rotation branch.
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = null;
    rotatingRef.current = false;
    stopMeter();
    emitLevels(IDLE_LEVELS());
    wantTranscriptRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      rec.requestData();
    } catch {
      /* ignore */
    }
    saveDraftMetadata();
    rec.stop();
  }, [stopMeter, emitLevels, saveDraftMetadata]);

  // Keep stopRef pointing at the latest stop() so the display-capture "ended"
  // listener (set up in start()) can end a session without a circular dep.
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    const flushActiveDraft = () => {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === "inactive") return;
      try {
        rec.requestData();
      } catch {
        /* ignore */
      }
      saveDraftMetadata();
    };

    window.addEventListener("pagehide", flushActiveDraft);
    document.addEventListener("visibilitychange", flushActiveDraft);
    return () => {
      window.removeEventListener("pagehide", flushActiveDraft);
      document.removeEventListener("visibilitychange", flushActiveDraft);
    };
  }, [saveDraftMetadata]);

  const resumeDraft = useCallback(async () => {
    if (!clip) return;
    await start(source, true);
  }, [clip, source, start]);

  const discard = useCallback(() => {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setSeconds(0);
    secondsRef.current = 0;
    emitLevels(IDLE_LEVELS());
    emitTranscript("");
    pendingTranscriptRef.current = "";
    setProcessingIssue(null);
    resetAudioActivity();
    generationRunRef.current += 1;
    requestIdRef.current = crypto.randomUUID();
    // Reset the durable-job state so a fresh recording starts a brand new job.
    jobIdRef.current = crypto.randomUUID();
    segmentIndexRef.current = 0;
    enqueuedRef.current = false;
    rotatingRef.current = false;
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = null;
    setSessionLabel("Untitled Lecture");
    setFailed(false);
    setRecoveredDraft(false);
    setLastSavedAt(null);
    setPhase("idle");
    setStage("idle");
    teardown();
    void enqueueDraftWrite(() => clearRecordingDraft(userId));
  }, [
    clip,
    resetAudioActivity,
    teardown,
    emitLevels,
    emitTranscript,
    enqueueDraftWrite,
    userId,
  ]);

  const generate = useCallback(async () => {
    if (!clip) return;
    setFailed(false);
    setProcessingIssue(null);
    setProcessingSafeToLeave(false);

    if (clip.silent) {
      const issueRunId = generationRunRef.current + 1;
      generationRunRef.current = issueRunId;
      setStage("analyzing");
      window.setTimeout(() => {
        if (generationRunRef.current !== issueRunId) return;
        setStage("idle");
        setFailed(true);
        setProcessingIssue({
          kind: "silent",
          title: "Atlas couldn't hear anything",
          message:
            "This recording looks silent, so there isn't enough audio to turn into notes. Try recording again with your mic closer or upload another file.",
        });
      }, 500);
      return;
    }

    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    const controller = new AbortController();
    let timedOut = false;
    let timeoutId: number | null = null;

    const supabase = createClient();
    try {
      const result = await Promise.race([
        uploadLectureAndGenerate({
          supabase,
          userId,
          data: clip.blob,
          requestId: clip.requestId,
          mimeType: clip.mime,
          ext: extForMime(clip.mime),
          durationSeconds: seconds || null,
          liveTranscript: liveTranscriptRef.current || null,
          signal: controller.signal,
          onStage: (nextStage) => {
            if (generationRunRef.current === runId && !timedOut) {
              setStage(nextStage);
            }
          },
        }),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error("processing-timeout"));
          }, PROCESSING_TIMEOUT_MS);
        }),
      ]);
      if (generationRunRef.current !== runId) return;
      if (result.status === "processing") {
        setProcessingSafeToLeave(true);
        toast.success("Atlas is generating your notes.");
      } else if (result.status === "failed") {
        toast.error("Atlas couldn't process this recording.");
      } else {
        toast.success("Your notes are ready!");
      }
      // Reset session before navigating to the new note.
      URL.revokeObjectURL(clip.url);
      setClip(null);
      setSeconds(0);
      secondsRef.current = 0;
      emitLevels(IDLE_LEVELS());
      emitTranscript("");
      setSessionLabel("Untitled Lecture");
      setRecoveredDraft(false);
      setLastSavedAt(null);
      setProcessingIssue(null);
      setPhase("idle");
      void enqueueDraftWrite(() => clearRecordingDraft(userId));
      if (result.status === "processing") {
        setStage("analyzing");
      } else {
        setStage("idle");
        router.push(`/notes/${result.id}`);
      }
    } catch (err) {
      if (generationRunRef.current !== runId) return;
      setStage("idle");
      setProcessingSafeToLeave(false);
      // Keep the clip around (phase stays "recorded") and offer a download so
      // the student can save the audio and re-upload it later.
      setFailed(true);
      if (timedOut) {
        setProcessingIssue({
          kind: "timeout",
          title: "Atlas is taking too long",
          message:
            "This recording took longer than expected to process. You can try again, download the audio, or record a shorter clip.",
        });
        toast.error("Processing took too long.");
        return;
      }

      const message = err instanceof Error ? err.message : "Something went wrong.";
      setProcessingIssue({
        kind: "failed",
        title: "Atlas couldn't process this",
        message:
          message === "processing-timeout"
            ? "This recording took longer than expected to process."
            : message,
      });
      toast.error(message);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }, [clip, router, seconds, userId, emitLevels, emitTranscript, enqueueDraftWrite]);

  const clearProcessingIssue = useCallback(() => {
    setProcessingIssue(null);
  }, []);

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
    subscribeMeter,
    getLevels,
    subscribeTranscript,
    getLiveTranscript,
    clip,
    stage,
    busy,
    processingIssue,
    processingSafeToLeave,
    recoveredDraft,
    lastSavedAt,
    failed,
    transcriptSupported,
    deviceCaptureSupported,
    deviceCaptureSupport,
    source,
    liveTranscriptActive,
    sessionLabel,
    setSessionLabel,
    start,
    resumeDraft,
    pause,
    resume,
    stop,
    discard,
    generate,
    clearProcessingIssue,
    download,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}
