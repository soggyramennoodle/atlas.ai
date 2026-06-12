import { describe, expect, it } from "vitest";
import {
  isMicRecordingSilent,
  SILENCE_MIN_ACTIVE_MS,
  SILENCE_MIN_DURATION_SECONDS,
  SILENCE_PEAK_THRESHOLD,
} from "@/lib/recording-silence";

describe("isMicRecordingSilent", () => {
  it("never blocks virtual (tab-share) recordings", () => {
    expect(
      isMicRecordingSilent({
        source: "device",
        seconds: 120,
        audioPeak: 0,
        activeAudioMs: 0,
        liveTranscript: "",
      })
    ).toBe(false);
  });

  it("blocks long mic takes with no meter activity or transcript", () => {
    expect(
      isMicRecordingSilent({
        source: "microphone",
        seconds: SILENCE_MIN_DURATION_SECONDS,
        audioPeak: SILENCE_PEAK_THRESHOLD - 0.01,
        activeAudioMs: SILENCE_MIN_ACTIVE_MS - 1,
        liveTranscript: "",
      })
    ).toBe(true);
  });

  it("allows mic takes with live transcript even when the meter is quiet", () => {
    expect(
      isMicRecordingSilent({
        source: "microphone",
        seconds: 30,
        audioPeak: 0,
        activeAudioMs: 0,
        liveTranscript: "today we cover thermodynamics",
      })
    ).toBe(false);
  });
});
