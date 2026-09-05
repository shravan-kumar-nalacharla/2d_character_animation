import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./project";
import { assertProject } from "./schema";
import { findBoneForArtwork } from "../rig/Skeleton";

describe("project format", () => {
  it("round-trips through JSON", () => {
    const restored: unknown = JSON.parse(JSON.stringify(createDefaultProject()));
    assertProject(restored);
    expect(restored.schemaVersion).toBe(1);
    expect(restored.rig.bones.length).toBeGreaterThan(10);
  });

  it("maps source artwork IDs to stable bones", () => {
    const project = createDefaultProject();
    expect(findBoneForArtwork(project.rig.bones, "ai24-right-hand")?.id).toBe("forearmR");
    expect(findBoneForArtwork(project.rig.bones, "ai24-head-hair")?.id).toBe("head");
  });

  it("stores every eye and eyebrow part independently", () => {
    const parts = createDefaultProject().character.face.parts;
    expect(Object.keys(parts)).toEqual(["eyeL", "eyeR", "browL", "browR", "highlightL", "highlightR"]);
    expect(parts.eyeL).not.toBe(parts.eyeR);
  });

  it("stores an independent transform for every mouth shape", () => {
    const mouths = createDefaultProject().character.face.mouthParts;
    expect(Object.keys(mouths)).toHaveLength(15);
    expect(mouths.AA).not.toBe(mouths.REST);
  });
});
