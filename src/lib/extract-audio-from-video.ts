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
