import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultFace } from "../project/project";
import { canonicalExpression, cryLoopSeconds, cryShakeOffset, eyeCenters, FaceRig, outsideAlphaPixelCount, resolveFacePreview, tearFlowOffset } from "./FaceRig";

describe("face preview", () => {
  it("is deterministic and respects manual mode", () => {
    const face = defaultFace();
    expect(resolveFacePreview(face, 0.2, true)).toEqual(resolveFacePreview(face, 0.2, true));
    expect(resolveFacePreview({ ...face, previewAutomation: false, mouth: "oh", gazeX: 0.7 }, 8, true)).toMatchObject({ mouth: "OH", gazeX: 0.7, gazeY: 0, blink: 0 });
  });
  it("keeps expression independent from gaze direction", () => {
    const face = { ...defaultFace(), eyeExpression: "angry" as const, previewAutomation: false };
    expect(canonicalExpression(face.eyeExpression)).toBe("angry");
    expect(resolveFacePreview({ ...face, gazeX: -1, gazeY: 1 }, 0, false)).toMatchObject({ gazeX: -1, gazeY: 1 });
    expect(canonicalExpression(face.eyeExpression)).toBe("angry");
  });
  it("keeps a generous resting gap between the eyes", () => {
    expect(eyeCenters.right - eyeCenters.left).toBeGreaterThanOrEqual(68);
  });
  it("moves anime tear highlights deterministically with timeline time", () => {
    expect(tearFlowOffset(0)).not.toBe(tearFlowOffset(.5));
    expect(tearFlowOffset(.5)).toBe(tearFlowOffset(.5));
  });
  it("loops water and pre-cry tremble exactly after two seconds", () => {
    const controls=defaultFace().cryControls;
    expect(tearFlowOffset(0,controls.flowSpeed)).toBeCloseTo(tearFlowOffset(cryLoopSeconds,controls.flowSpeed),8);
    const start=cryShakeOffset(0,controls),end=cryShakeOffset(cryLoopSeconds,controls);
    expect(end.x).toBeCloseTo(start.x,8);expect(end.y).toBeCloseTo(start.y,8);expect(end.rotation).toBeCloseTo(start.rotation,8);
  });
  it("detects any tear alpha outside the face matte", () => {
    expect(outsideAlphaPixelCount([0,255,0,255],[0,255,0,255])).toBe(0);
    expect(outsideAlphaPixelCount([0,255,0,255],[0,255,0,0])).toBe(1);
  });
  it("renders both flowing tear boundaries inside the final face matte", () => {
    const face={...defaultFace(),eyeExpression:"crying" as const,previewAutomation:false};
    const markup=renderToStaticMarkup(createElement(FaceRig,{face,calibration:{eyeVisualScale:1.12,mouthVisualScale:.74,gazeRangeX:6,gazeRangeY:3,eyeOpennessStrength:1.15,expressionStrength:1.15,headRotationStrength:1.35,headTranslationStrength:1,maxNormalRotation:7,maxReactionRotation:13,gazeReturnSpeed:.18,headFollowStrength:.72,parallaxStrength:.45,showNeckAnchor:false,showHeadPivot:false,showEyeCenters:false,showGazeBounds:false,showCurrentGaze:false,showMouthAnchor:false,showEyeScaleBounds:false,showLanguageMap:false},time:.5,playing:false}));
    expect(markup).toContain('data-face-matte="FACE_INTERIOR_MATTE"');
    expect(markup.match(/data-tear-boundary=/g)).toHaveLength(2);
    expect(markup).not.toContain("waterfall_left.png");
  });
});
