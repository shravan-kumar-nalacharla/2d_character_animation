import { describe, expect, it } from "vitest";
import { defaultPerformanceProfile } from "../project/project";
import { transcriptFromText } from "../director/PerformanceProviders";
import { VisemeSequenceOptimizer, type VisemeInput } from "./VisemeSequenceOptimizer";

describe("VisemeSequenceOptimizer", () => {
  it("collapses duplicates and short A-B-A flicker without losing closures", () => {
    const raw: VisemeInput[] = [{ start: 0, end: .12, viseme: "AA", strength: .8, sourceText: "a" }, { start: .12, end: .17, viseme: "TDN", strength: .5, sourceText: "t" }, { start: .17, end: .3, viseme: "AA", strength: .8, sourceText: "a" }, { start: .3, end: .36, viseme: "MBP", strength: .9, sourceText: "m" }, { start: .36, end: .43, viseme: "MBP", strength: .9, sourceText: "b" }];
    const result = new VisemeSequenceOptimizer().optimize(raw, transcriptFromText("Idi enti?", 1), defaultPerformanceProfile());
    expect(result.events.map((event) => event.viseme)).toEqual(["AA", "MBP"]);
    expect(result.diagnostics.mergedDuplicates).toBe(1);
    expect(result.diagnostics.hysteresisMerges).toBe(1);
  });
});
