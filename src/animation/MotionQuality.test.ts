import { describe, expect, it } from "vitest";
import { sanitizeMotionTracks } from "./MotionQuality";
import type { AnimationTrack } from "../project/schema";

describe("motion quality", () => {
  it("limits impossible continuous jumps without touching discrete visemes", () => {
    const numeric: AnimationTrack = { id: "head", name: "head", layer: "aiHead", target: "bone.head.rotation", valueType: "number", muted: false, locked: false, generated: true, keyframes: [{ id: "a", time: 0, value: 0, interpolation: "bezier", source: "procedural" }, { id: "b", time: .01, value: 20, interpolation: "bezier", source: "procedural" }] };
    const discrete: AnimationTrack = { ...numeric, id: "mouth", target: "face.mouth", valueType: "string", keyframes: [{ ...numeric.keyframes[0], value: "REST" }, { ...numeric.keyframes[1], value: "AA" }] };
    const [head, mouth] = sanitizeMotionTracks([numeric, discrete]);
    expect(Number(head.keyframes[1].value)).toBeLessThanOrEqual(.9);
    expect(mouth.keyframes[1].value).toBe("AA");
  });
});
