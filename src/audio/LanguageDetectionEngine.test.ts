import { describe, expect, it } from "vitest";
import { transcriptFromText } from "../director/PerformanceProviders";
import { LanguageDetectionEngine } from "./LanguageDetectionEngine";

describe("LanguageDetectionEngine", () => {
  const cases: Array<[string, string[]]> = [
    ["What are you doing?", ["en"]],
    ["Ye kya kar raha hai?", ["hi"]],
    ["Mujhe bilkul nahi pata.", ["hi"]],
    ["ఇది ఏంటి?", ["te"]],
    ["Idi enti?", ["te"]],
    ["Guys idi actually crazy.", ["en", "te"]],
    ["Guys ye actually crazy hai.", ["en", "hi"]],
    ["Bhai idi enti ra?", ["hi", "te"]],
  ];
  it.each(cases)("tags %s", (text, expected) => {
    const result = new LanguageDetectionEngine().detect(transcriptFromText(text, 2));
    const found = new Set(result.segments.flatMap((segment) => segment.words.map((word) => word.language)));
    expected.forEach((language) => expect(found.has(language as "en" | "hi" | "te")).toBe(true));
  });
});
