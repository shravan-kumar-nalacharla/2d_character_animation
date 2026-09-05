import { describe, expect, it } from "vitest";
import { analyzeSamples } from "../audio/AudioAnalysisEngine";
import { defaultFace, defaultPerformanceProfile } from "../project/project";
import { RuleBasedPerformanceProvider, transcriptFromText } from "../director/PerformanceProviders";
import { evaluateFace, evaluateTrack } from "./evaluate";
import { planAnimation, wordVisemes } from "./PerformancePlanner";
import type { AnimationTrack } from "../project/schema";

describe("animation planning", () => {
  it("turns a plan into editable deterministic tracks", async () => {
    const audio = { name: "test.wav", mimeType: "audio/wav", size: 1, duration: 3, hash: "hash" };
    const transcript = transcriptFromText("Wait... WHAT?!", 3);
    const analysis = analyzeSamples(new Float32Array(3000).fill(0.3), 1000);
    const plan = await new RuleBasedPerformanceProvider().analyzePerformance(audio, transcript, analysis, defaultPerformanceProfile());
    const tracks = await planAnimation(audio, transcript, analysis, plan, defaultPerformanceProfile(), 381);
    expect(tracks.some((track) => track.target === "face.mouth")).toBe(true);
    expect(tracks.some((track) => track.target === "bone.neck.y")).toBe(true);
    expect(tracks.some((track) => track.target === "bone.neck.rotation")).toBe(true);
    expect(tracks.some((track) => track.target === "bone.head.rotation")).toBe(true);
    expect(tracks.some((track) => track.target === "face.jawOpen")).toBe(true);
    expect(tracks.some((track) => track.target === "face.lipRound")).toBe(true);
    expect(tracks.find((track) => track.target === "face.mouth")?.metadata?.visemeOptimization).toBeTruthy();
    expect(tracks.some((track) => track.target === "face.eyeOpenness")).toBe(true);
    expect(tracks.some((track) => track.target === "face.eyeSystem.left.expression")).toBe(true);
    expect(tracks.some((track) => track.target === "face.eyeSystem.right.expression")).toBe(true);
    expect(tracks.some((track) => track.target === "face.browSystem.left.preset")).toBe(true);
    expect(tracks.some((track) => track.target === "face.browSystem.right.preset")).toBe(true);
    expect(tracks.some((track) => track.target.includes("sunglasses"))).toBe(false);
    expect(tracks.filter((track) => track.layer === "aiGaze").flatMap((track) => track.keyframes).every((frame) => typeof frame.value !== "number" || Math.abs(frame.value) <= 1)).toBe(true);
    expect(tracks.filter((track) => track.layer === "aiGaze").flatMap((track) => track.keyframes).every((frame) => frame.time >= 0)).toBe(true);
    expect(tracks.every((track) => track.generated)).toBe(true);
    expect(evaluateFace(defaultFace(), tracks, 1).mouth).toBeTypeOf("string");
  });

  it("interpolates numeric keys but holds strings", () => {
    const numeric: AnimationTrack = { id: "n", name: "n", layer: "aiHead", target: "x", valueType: "number", muted: false, locked: false, generated: true, keyframes: [{ id: "a", time: 0, value: 0, interpolation: "linear", source: "procedural" }, { id: "b", time: 1, value: 10, interpolation: "linear", source: "procedural" }] };
    expect(evaluateTrack(numeric, 0.5)).toBe(5);
  });

  it("creates varied visemes for Hindi, Telugu, and romanized speech", () => {
    const analysis = analyzeSamples(new Float32Array(1000).fill(0.2), 1000);
    for (const [text, language] of [["नमस्ते", "hi"], ["తెలియదు", "te"], ["idi enti", "te"]] as const) {
      const visemes = wordVisemes(text, 0, 1, analysis, language);
      expect(visemes.length).toBeGreaterThan(0);
      expect(visemes.some((cue) => cue.viseme !== "REST")).toBe(true);
    }
  });

  it("layers semantic mouth acting over phonetic visemes", async () => {
    const audio = { name: "test.wav", mimeType: "audio/wav", size: 1, duration: 2, hash: "hash" };
    const transcript = transcriptFromText("I honestly don't know.", 2), analysis = analyzeSamples(new Float32Array(2000).fill(0.2), 1000), profile = defaultPerformanceProfile();
    const plan = await new RuleBasedPerformanceProvider().analyzePerformance(audio, transcript, analysis, profile);
    const tracks = await planAnimation(audio, transcript, analysis, plan, profile, 381);
    expect(tracks.some((track) => track.target === "face.mouthOffsetX" && track.keyframes.some((frame) => frame.value !== 0))).toBe(true);
    expect(tracks.find((track) => track.target === "face.mouth")?.keyframes.some((frame) => frame.value === "REST")).toBe(true);
    expect(tracks.find((track) => track.target === "face.gazeX")?.keyframes.length).toBeGreaterThanOrEqual(4);
    expect(tracks.find((track) => track.target === "face.jawOpen")?.keyframes.some((frame) => typeof frame.value === "number" && frame.value > 0)).toBe(true);
  });
});
