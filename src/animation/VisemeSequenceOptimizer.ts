import type { CharacterPerformanceProfile, MouthShape, ProductionViseme, TimedTranscript } from "../project/schema";
import { productionViseme } from "../character/FaceAssets";

export interface VisemeInput { start: number; end: number; viseme: MouthShape; strength: number; sourceText: string }
export interface OptimizedViseme extends VisemeInput { viseme: ProductionViseme; onset: number; apex: number; offset: number; importance: number }
export interface VisemeOptimizationDiagnostics { detectedLanguage: string; speechRate: "slow" | "normal" | "fast" | "veryFast"; wordsPerSecond: number; rawEvents: number; rawEventsPerSecond: number; optimizedEvents: number; optimizedEventsPerSecond: number; mergedDuplicates: number; droppedLowVisualEvents: number; hysteresisMerges: number; coarticulationMerges: number; density: number; preset: string }

const importance: Record<ProductionViseme, number> = { REST: 1, MBP: 1, FV: .95, L: .55, TDN: .42, KG: .35, CHJSH: .58, SZ: .5, R: .55, AA: 1, AEE: .82, EEI: .88, UH: .7, OH: .95, OOW: .85 };
const essential = new Set<ProductionViseme>(["REST", "MBP", "FV", "AA", "AEE", "EEI", "OH", "OOW"]);

export class VisemeSequenceOptimizer {
  optimize(raw: VisemeInput[], transcript: TimedTranscript, profile: CharacterPerformanceProfile) {
    const duration = Math.max(.01, transcript.segments.at(-1)?.end ?? raw.at(-1)?.end ?? 0), words = transcript.segments.flatMap((segment) => segment.words), wordsPerSecond = words.length / duration;
    const rate: VisemeOptimizationDiagnostics["speechRate"] = wordsPerSecond > 4.2 ? "veryFast" : wordsPerSecond > 3 ? "fast" : wordsPerSecond < 1.7 ? "slow" : "normal";
    const languageCounts = words.reduce((counts, word) => ({ ...counts, [word.language ?? "en"]: (counts[word.language ?? "en"] ?? 0) + 1 }), {} as Record<string, number>), language = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? transcript.language;
    const presetOffset = profile.lipSync.preset === "Precise" ? 18 : profile.lipSync.preset === "Cartoon" ? -12 : profile.lipSync.preset === "Mumble" ? -24 : 0;
    const languageOffset = language === "te" ? -5 : language === "hi" ? -2 : 0, density = clamp(profile.lipSync.density + presetOffset + languageOffset, 5, 100);
    const minDuration = profile.lipSync.minimumVisemeDuration * (rate === "veryFast" ? 1.45 : rate === "fast" ? 1.25 : 1) * (100 - density * .35) / 75;
    let mergedDuplicates = 0, hysteresisMerges = 0, droppedLowVisualEvents = 0;
    const merged: Array<VisemeInput & { viseme: ProductionViseme }> = [];
    for (const cue of raw) {
      const next = { ...cue, viseme: productionViseme(cue.viseme) }, previous = merged.at(-1);
      if (previous && previous.viseme === next.viseme && next.start - previous.end < .12) { previous.end = Math.max(previous.end, next.end); previous.strength = Math.max(previous.strength, next.strength); mergedDuplicates++; }
      else merged.push(next);
    }
    for (let index = 1; index < merged.length - 1;) {
      const before = merged[index - 1], middle = merged[index], after = merged[index + 1];
      if (before.viseme === after.viseme && middle.end - middle.start < minDuration * 1.35 && importance[middle.viseme] < importance[before.viseme] && !essential.has(middle.viseme)) { before.end = after.end; before.strength = Math.max(before.strength, after.strength); merged.splice(index, 2); hysteresisMerges++; }
      else index++;
    }
    for (let index = 0; index < merged.length;) {
      const cue = merged[index], weak = cue.end - cue.start < minDuration && importance[cue.viseme] < .7 && !essential.has(cue.viseme);
      if (!weak) { index++; continue; }
      const neighbor = merged[index - 1] ?? merged[index + 1]; if (neighbor) { neighbor.start = Math.min(neighbor.start, cue.start); neighbor.end = Math.max(neighbor.end, cue.end); }
      merged.splice(index, 1); droppedLowVisualEvents++;
    }
    const targetCount = Math.max(1, Math.ceil(duration * (2.7 + density * .055)));
    if (merged.length > targetCount) {
      const removable = merged.map((cue, index) => ({ index, score: importance[cue.viseme] * (cue.end - cue.start) * cue.strength })).filter(({ index }) => !essential.has(merged[index].viseme)).sort((a, b) => a.score - b.score).slice(0, merged.length - targetCount).map(({ index }) => index).sort((a, b) => b - a);
      for (const index of removable) { const cue = merged[index], neighbor = merged[index - 1] ?? merged[index + 1]; if (neighbor) neighbor.end = Math.max(neighbor.end, cue.end); merged.splice(index, 1); droppedLowVisualEvents++; }
    }
    const prep = .045 + profile.lipSync.coarticulation * .065;
    const events: OptimizedViseme[] = merged.map((cue, index) => ({ ...cue, onset: Math.max(index ? merged[index - 1].start : 0, cue.start - prep), apex: cue.start + Math.min(.11, Math.max(.045, (cue.end - cue.start) * .42)), offset: Math.min(merged[index + 1]?.start ?? cue.end + prep, cue.end + prep), importance: importance[cue.viseme] }));
    const diagnostics: VisemeOptimizationDiagnostics = { detectedLanguage: language, speechRate: rate, wordsPerSecond, rawEvents: raw.length, rawEventsPerSecond: raw.length / duration, optimizedEvents: events.length, optimizedEventsPerSecond: events.length / duration, mergedDuplicates, droppedLowVisualEvents, hysteresisMerges, coarticulationMerges: Math.max(0, raw.length - events.length - mergedDuplicates - droppedLowVisualEvents), density, preset: profile.lipSync.preset };
    return { events, diagnostics };
  }
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
