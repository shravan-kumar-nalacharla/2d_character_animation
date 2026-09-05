import { describe, expect, it } from "vitest";
import { analyzeSamples } from "./AudioAnalysisEngine";

describe("audio analysis", () => {
  it("finds speech surrounded by silence deterministically", () => {
    const samples = new Float32Array(2000);
    for (let index = 500; index < 1500; index++) samples[index] = Math.sin(index / 5) * 0.6;
    const analysis = analyzeSamples(samples, 1000);
    expect(analysis.duration).toBe(2);
    expect(analysis.speechRegions).toHaveLength(1);
    expect(analysis.speechRegions[0].start).toBeCloseTo(0.5, 1);
    expect(analysis.speechRegions[0].end).toBeCloseTo(1.5, 1);
    expect(analysis.pauses.length).toBeGreaterThanOrEqual(1);
    expect(analysis.waveform).toHaveLength(64);
  });
});
