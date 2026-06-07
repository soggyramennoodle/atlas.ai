import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { baseMimeType } from "@/lib/upload-lecture";

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "m4v",
  "mkv",
  "webm",
  "avi",
  "wmv",
  "3gp",
]);

/** True when the file looks like a video container (may still be audio-only .mp4). */
export function isLikelyVideoFile(file: File): boolean {
  const t = baseMimeType(file.type || "");
  if (t.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.has(ext);
}

/**
 * Returns true when the file carries a video track that should be stripped
 * before upload. Audio-only MP4/M4A files return false and upload as-is.
 */
export async function fileHasVideoTrack(file: File): Promise<boolean> {
  if (!isLikelyVideoFile(file)) return false;
  const t = baseMimeType(file.type || "");
  if (t.startsWith("video/")) return true;

  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    el.onloadedmetadata = () => {
      resolve(el.videoWidth > 0 && el.videoHeight > 0);
      cleanup();
    };
    el.onerror = () => {
      resolve(true);
      cleanup();
    };
    el.src = url;
  });
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;

  ffmpegLoading = (async () => {
    const ffmpeg = new FFmpeg();
    // Self-hosted under /ffmpeg (jsdelivr is blocked by CSP). toBlobURL fetches
    // these same-origin files then hands ffmpeg blob: URLs; the worker's
    // emscripten core fetches the wasm blob to compile it, which is why CSP
    // needs connect-src blob: + script-src 'wasm-unsafe-eval' (see next.config.ts).
    const baseURL = `${window.location.origin}/ffmpeg`;
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch (err) {
      ffmpegLoading = null;
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not load audio extraction tools (${detail}). Refresh and try again.`
      );
    }
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoading;
}

function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const url = URL.createObjectURL(blob);
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

/**
 * Strip the video track from an MP4 (or similar) and return audio-only M4A.
 * Runs in the browser so Gemini only receives audio — much cheaper than
 * sending `video/mp4` to 2.5 Pro (which tokenizes frames).
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<{ blob: Blob; mimeType: string; duration: number }> {
  const ffmpeg = await getFfmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.m4a";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  try {
    // AAC @ 128 kbps — reliable in ffmpeg.wasm and plenty for lecture speech.
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-acodec",
      "aac",
      "-b:a",
      "128k",
      outputName,
    ]);
  } catch (err) {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not extract audio from this video (${detail}). Try exporting audio as M4A or MP3 first.`
    );
  }

  let data: Uint8Array | string;
  try {
    data = await ffmpeg.readFile(outputName);
  } catch {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    throw new Error(
      "This video has no audio track we could extract. Try a file that includes lecture audio."
    );
  }
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  const bytes =
    data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const blob = new Blob([new Uint8Array(bytes)], { type: "audio/mp4" });
  const duration = await readDuration(blob);

  return { blob, mimeType: "audio/mp4", duration };
}

/** Default lecture segment length — matches the live-recording pipeline (~5 min). */
export const UPLOAD_SEGMENT_SECONDS = 300;

/**
 * Split a lecture file (audio or video) into ~5-minute audio-only chunks, so an
 * upload flows through the exact same segment→transcribe→splice worker the live
 * recorder uses. Each chunk is mono AAC @ 64 kbps (plenty for speech) — small
 * enough for the direct segment-upload path and well within Gemini's per-call
 * limits. Returns the chunks in order; the caller uploads each as a segment.
 *
 * `-vn` drops any video track, so this works for both audio files and videos in
 * one pass (no separate extraction step needed).
 */
export async function extractAudioChunks(
  file: File,
  segmentSeconds = UPLOAD_SEGMENT_SECONDS,
  onProgress?: (ratio: number) => void
): Promise<{ chunks: Blob[]; mimeType: string }> {
  const ffmpeg = await getFfmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${ext}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  try {
    // ADTS .aac segments split cleanly on a raw bitstream, so the segment muxer
    // produces independently-decodable chunks Gemini accepts as audio/aac.
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-ac",
      "1",
      "-c:a",
      "aac",
      "-b:a",
      "64k",
      "-f",
      "segment",
      "-segment_time",
      String(segmentSeconds),
      "seg%03d.aac",
    ]);
  } catch (err) {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not split this lecture for processing (${detail}).`);
  }

  // Collect the seg000.aac, seg001.aac… outputs in order. Read until a file is
  // missing rather than relying on a directory-listing API.
  const chunks: Blob[] = [];
  for (let i = 0; i < 10_000; i++) {
    const name = `seg${String(i).padStart(3, "0")}.aac`;
    let data: Uint8Array | string;
    try {
      data = await ffmpeg.readFile(name);
    } catch {
      break;
    }
    const buf =
      data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    if (buf.length === 0) {
      await ffmpeg.deleteFile(name).catch(() => {});
      break;
    }
    chunks.push(new Blob([new Uint8Array(buf)], { type: "audio/aac" }));
    await ffmpeg.deleteFile(name).catch(() => {});
  }

  await ffmpeg.deleteFile(inputName).catch(() => {});

  if (chunks.length === 0) {
    throw new Error(
      "This file has no audio track we could process. Try a file that includes lecture audio."
    );
  }

  return { chunks, mimeType: "audio/aac" };
}
