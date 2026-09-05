import { describe, expect, it } from "vitest";
import { parseTimestamp, transcriptInputFromInteraction, TranscriptNormalizer } from "./TranscriptNormalizer";

describe("TranscriptNormalizer", () => {
  it("parses supported timestamp formats and rejects non-finite values", () => {
    expect(parseTimestamp(1.42)).toBe(1.42);
    expect(parseTimestamp("1.42s")).toBe(1.42);
    expect(parseTimestamp("00:01.420")).toBe(1.42);
    expect(parseTimestamp("00:01:01.420")).toBe(61.42);
    expect(parseTimestamp(Infinity)).toBeNull();
  });

  it("repairs malformed AI word timing without weakening final validation", () => {
    const transcript = new TranscriptNormalizer().normalize({ language: "hinglish", segments: [{ text: "before hello world", start: 1, end: 2, words: [
      null,
      { text: "world", start: "1.497s", end: "1.7s" },
      { text: ",", start: 1.5, end: 1.5 },
      { text: "before", start: 1.1 },
      { text: "hello", start: "00:01.300", end: 1.503 },
      { text: "outside", start: 74.9, end: 75.14 },
    ] }] }, 75.12);
    expect(transcript.segments[0].words.map((word) => word.text)).toEqual(["before", "hello", "world", "outside"]);
    expect(transcript.segments[0].words.every((word) => Number.isFinite(word.start) && word.end > word.start && word.end <= 75.12)).toBe(true);
    expect(transcript.segments[0].words[0].source).toBe("estimated");
    expect(transcript.diagnostics?.some((item) => item.reason.includes("Punctuation"))).toBe(true);
  });

  it("estimates a reliable timeline when a segment has text but no usable words", () => {
    const transcript = new TranscriptNormalizer().normalize({ segments: [{ text: "hello there", startTime: "0s", endTime: "1s", words: [{ text: "hello" }, { text: "there" }] }] }, 1);
    expect(transcript.segments[0].words).toHaveLength(2);
    expect(transcript.segments[0].words[1].end).toBeLessThanOrEqual(1);
  });

  it("parses native Gemini word_info annotations before normalization", () => {
    const raw = transcriptInputFromInteraction({ output_text: "Hello world", steps: [{ content: [{ annotations: [{ type: "word_info", text: "Hello", start_offset: "0.100s", end_offset: "0.450s" }, { type: "word_info", text: "world", start_offset: "0.500s", end_offset: "0.850s" }] }] }] }, 1);
    const transcript = new TranscriptNormalizer().normalize(raw, 1);
    expect(transcript.segments[0].words.map((word) => [word.text, word.start, word.end])).toEqual([["Hello", 0.1, 0.45], ["world", 0.5, 0.85]]);
  });
});
