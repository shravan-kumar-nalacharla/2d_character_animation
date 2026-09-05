import { describe, expect, it } from "vitest";
import { validateCharacterAssetManifestV2 } from "./AssetManifestV2";

const asset = (id: string, slot = "eye.left") => ({ id, path: `${id}.png`, format: "png", slot, view: "front", width: 512, height: 512, anchor: { x: 256, y: 256 }, bounds: { x: 0, y: 0, width: 512, height: 512 }, tags: [] });

describe("Asset Contract V2", () => {
  it("accepts a complete expression preset", () => {
    const assets = [asset("e.l"), asset("e.r", "eye.right"), asset("b.l", "eyebrow.left"), asset("b.r", "eyebrow.right"), asset("m", "mouth.silent"), asset("s", "face.shading")];
    const manifest = { schemaVersion: 2, id: "test", character: "test", revision: 1, sideConvention: "character", designRules: { ageStyle: "teen", facialHair: false, eyebrowColor: "black", pupilPalette: ["#080a0d"] }, assets, hands: [], shoes: [], views: [], expressions: [{ id: "neutral", label: "Neutral", emotionTags: [], leftEye: "e.l", rightEye: "e.r", leftEyebrow: "b.l", rightEyebrow: "b.r", silentMouth: "m", shading: "s" }] };
    expect(validateCharacterAssetManifestV2(manifest).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("rejects missing links, duplicate ids, and anchors outside the canvas", () => {
    const broken = asset("same"); broken.anchor.x = 999;
    const manifest = { schemaVersion: 2, id: "test", assets: [broken, asset("same")], hands: [], shoes: [], views: [], expressions: [{ id: "x", leftEye: "missing", rightEye: "missing", leftEyebrow: "missing", rightEyebrow: "missing", silentMouth: "missing", shading: "missing" }] };
    const issues = validateCharacterAssetManifestV2(manifest);
    expect(issues.some((issue) => issue.message.includes("Duplicate"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("Anchor"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("Missing linked asset"))).toBe(true);
  });
});
