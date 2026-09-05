import { describe, expect, it } from "vitest";
import { eyeExpressions } from "./FaceAssets";
import { browPresets, eyeDesigns, expressionForSide } from "./EyePresets";

describe("expressive eye library", () => {
  it("has a complete finite design for every exposed expression", () => {
    expect(Object.keys(eyeDesigns)).toEqual(expect.arrayContaining(eyeExpressions));
    for (const expression of eyeExpressions) {
      const design = eyeDesigns[expression];
      expect(design.tier).toBeGreaterThanOrEqual(0);
      expect(design.tier).toBeLessThanOrEqual(3);
      for (const value of [design.scaleX, design.scaleY, design.openness, design.squint, design.rotation, design.pupilScale]) expect(Number.isFinite(value)).toBe(true);
      expect(browPresets).toContain(design.brow);
    }
  });

  it("keeps left and right winks independent", () => {
    expect(expressionForSide("winkLeft", "left")).toBe("happyClosed");
    expect(expressionForSide("winkLeft", "right")).toBe("friendly");
    expect(expressionForSide("winkRight", "right")).toBe("happyClosed");
    expect(expressionForSide("winkRight", "left")).toBe("friendly");
  });
  it("keeps the angry family readable instead of collapsing into slits", () => {
    expect(eyeDesigns.angry.openness).toBeGreaterThanOrEqual(.8);
    expect(eyeDesigns.veryAngry.openness).toBeGreaterThanOrEqual(.7);
    expect(eyeDesigns.rage.openness).toBeGreaterThanOrEqual(.7);
    expect(eyeDesigns.angrySqueezed.style).toBe("closed");
    expect(eyeDesigns.shadowRage.tier).toBe(3);
    expect(eyeDesigns.sobCrying.tier).toBe(3);
  });
});
