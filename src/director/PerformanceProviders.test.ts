import { describe, expect, it } from "vitest";
import { analyzeSamples } from "../audio/AudioAnalysisEngine";
import { defaultPerformanceProfile } from "../project/project";
import { RuleBasedPerformanceProvider, transcriptFromText, validatePerformancePlan } from "./PerformanceProviders";

describe("performance providers", () => {
  it("directs surprise differently from uncertainty", async () => {
    const transcript = transcriptFromText("Wait... WHAT?! I honestly don't know.", 4);
    const analysis = analyzeSamples(new Float32Array(4000).fill(0.2), 1000);
    const plan = await new RuleBasedPerformanceProvider().analyzePerformance({ name: "test.wav", mimeType: "audio/wav", size: 1, duration: 4, hash: "test" }, transcript, analysis, defaultPerformanceProfile());
    expect(plan.segments[0].emotion.primary).toBe("surprised");
    expect(plan.segments.at(-1)?.emotion.primary).toBe("confused");
    expect(plan.segments[0].headEvents[0]?.type).toBe("surprise_recoil");
  });

  it("clamps untrusted AI values", () => {
    const plan = validatePerformancePlan({ overall: { energy: 9 }, segments: [{ start: 0, end: 1, emotion: { primary: "invented", intensity: -2 }, intent: "invented", expression: {}, gaze: {} }] }, 2, "gemini");
    expect(plan.overall.energy).toBe(1);
    expect(plan.segments[0].emotion.primary).toBe("neutral");
    expect(plan.segments[0].emotion.intensity).toBe(0);
  });

  it("distinguishes rage and heavy sobbing from ordinary emotion", async () => {
    const audio = { name: "test.wav", mimeType: "audio/wav", size: 1, duration: 2, hash: "test" }, analysis = analyzeSamples(new Float32Array(2000).fill(.25), 1000), provider = new RuleBasedPerformanceProvider();
    const rage = await provider.analyzePerformance(audio, transcriptFromText("I am furious with rage!", 2), analysis, defaultPerformanceProfile());
    const crying = await provider.analyzePerformance(audio, transcriptFromText("I am sobbing and crying.", 2), analysis, defaultPerformanceProfile());
    expect(rage.segments[0].expression.preset).toBe("shadowRage");
    expect(crying.segments[0].expression.preset).toBe("sobCrying");
  });
});
