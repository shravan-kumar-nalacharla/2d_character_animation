import type { AnimationTrack, Bone, CharacterPerformanceProfile, FaceCalibration, FaceState, ProjectDocument } from "./schema";
import { productionVisemes } from "../character/FaceAssets";

export const defaultFace = (): FaceState => ({
  gazeX: 0,
  gazeY: 0,
  blink: 0,
  eyeOpenness: 1,
  mouth: "REST",
  mouthOffsetX: 0,
  mouthOffsetY: 0,
  mouthRotation: 0,
  jawOpen: 0,
  mouthWidth: 0,
  lipRound: 0,
  lipPress: 0,
  mouthIntensity: 0,
  eyeExpression: "neutral",
  eyeSystem: {
    left: { expression: "inherit", scaleX: 1, scaleY: 1, openness: 1, squint: 0, rotation: 0, pupilScale: 1, pupilX: 0, pupilY: 0, highlightStyle: "auto" },
    right: { expression: "inherit", scaleX: 1, scaleY: 1, openness: 1, squint: 0, rotation: 0, pupilScale: 1, pupilX: 0, pupilY: 0, highlightStyle: "auto" },
  },
  browSystem: {
    left: { preset: "auto", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, innerHeight: 0, outerHeight: 0, curve: 0, intensity: 1 },
    right: { preset: "auto", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, innerHeight: 0, outerHeight: 0, curve: 0, intensity: 1 },
  },
  accessories: { sunglasses: { visible: false, style: "blackClassic", scale: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 } },
  faceFx: "auto",
  extraFaceFx: "auto",
  tears: "auto",
  cryControls: { state: "auto", enableShake: true, enableTears: true, shakeAmount: 1.6, shakeFrequency: 12, shakeVerticalRatio: .55, shakeRotation: .18, flowSpeed: 24, turbulenceAmount: 2.2, turbulenceSize: 24, opacity: .92, amount: 1, showFaceMatte: false },
  hairStyle: "canonical",
  parts: Object.fromEntries(["eyeL", "eyeR", "browL", "browR", "highlightL", "highlightR"].map((name) => [name, { x: 0, y: 0, scaleX: 1, scaleY: 1 }])) as FaceState["parts"],
  mouthParts: Object.fromEntries(productionVisemes.map((name) => [name, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }])) as FaceState["mouthParts"],
  previewAutomation: true,
});

export const defaultFaceCalibration = (): FaceCalibration => ({
  eyeVisualScale: 1.12, mouthVisualScale: 0.74, gazeRangeX: 6, gazeRangeY: 3,
  eyeOpennessStrength: 1.15, expressionStrength: 1.15, headRotationStrength: 1.35, headTranslationStrength: 1,
  maxNormalRotation: 7, maxReactionRotation: 13, gazeReturnSpeed: 0.18, headFollowStrength: 0.72,
  parallaxStrength: 0.45,
  showNeckAnchor: false, showHeadPivot: false, showEyeCenters: false, showGazeBounds: false,
  showCurrentGaze: false, showMouthAnchor: false, showEyeScaleBounds: false,
  showLanguageMap: false,
});

export const defaultPerformanceProfile = (): CharacterPerformanceProfile => ({
  fullBodyStrength: 1, gestureStrength: .85, gestureFrequency: .45,
  preset: "YouTube",
  defaultEnergy: 0.67,
  expressionStrength: 0.72,
  mouthStrength: 0.82,
  eyeActivity: 0.45,
  eyebrowActivity: 0.67,
  headMotion: 0.58,
  bodyMotion: 0.42,
  emotionStrength: 0.72,
  animationSmoothness: 0.7,
  comedicExaggeration: 0.55,
  performanceDensity: 0.55,
  head: { motionStrength: 1.75, neckPivotRequired: true, maxNormalRotation: 12, maxReactionRotation: 18, minimumPoseDuration: 0.58, eventCooldown: 0.52 },
  eyes: { visualScale: 1.12, horizontalGazeStrength: 1.25, verticalGazeStrength: 1.15, minimumGazeDuration: 0.5, transitionDuration: 0.2, returnDuration: 0.32 },
  mouth: { visualScale: 0.74 },
  lipSync: { density: 50, preset: "Natural", minimumVisemeDuration: 0.11, coarticulation: 0.72 },
});

const track = (id: string, name: string, layer: AnimationTrack["layer"], target = "", valueType: AnimationTrack["valueType"] = "number"): AnimationTrack => ({
  id, name, layer, target, valueType, muted: false, locked: false, generated: layer !== "base" && layer !== "manual", keyframes: [],
});

const bone = (
  id: string,
  name: string,
  parentId: string | null,
  pivotX: number,
  pivotY: number,
  length: number,
  artworkPrefixes: string[] = [],
  minRotation = -180,
  maxRotation = 180,
): Bone => ({
  id,
  name,
  parentId,
  artworkPrefixes,
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  length,
  pivotX,
  pivotY,
  minRotation,
  maxRotation,
  stiffness: 0.5,
  visible: true,
  locked: false,
});

export function createDefaultProject(): ProjectDocument {
  const bones = [
    bone("root", "Root", null, 875, 975, 0),
    bone("hips", "Hips", "root", 895, 570, 120, ["ai24-left-thigh", "ai24-right-thigh"]),
    bone("torso", "Torso", "hips", 895, 430, 170, ["ai24-body", "ai24-layer-18", "ai24-layer-18-copy", "ai24-collar", "ai24-shadings", "ai24-hoodie-threads"]),
    bone("neck", "Neck", "torso", 895, 270, 60, ["ai24-neck"], -35, 35),
    bone("head", "Head", "neck", 894, 170, 90, ["ai24-head-"], -35, 35),
    bone("upperArmR", "Upper Arm R", "torso", 820, 325, 115, ["ai24-right-hand-shoulder"], -120, 120),
    bone("forearmR", "Forearm R", "upperArmR", 790, 420, 120, ["ai24-right-hand"], -145, 20),
    bone("handR", "Hand R (missing art)", "forearmR", 790, 535, 35),
    bone("upperArmL", "Upper Arm L", "torso", 975, 320, 100, ["ai24-left-hand-shoulder"], -120, 120),
    bone("forearmL", "Forearm L", "upperArmL", 1000, 415, 120, ["ai24-left-hand"], -20, 145),
    bone("handL", "Hand L (missing art)", "forearmL", 1000, 520, 35),
    bone("thighR", "Thigh R", "hips", 845, 585, 160, ["ai24-right-thigh"], -70, 70),
    bone("shinR", "Shin R", "thighR", 835, 735, 170, ["ai24-right-leg"], -10, 145),
    bone("footR", "Foot R", "shinR", 815, 905, 75, ["right_foot_"], -45, 45),
    bone("thighL", "Thigh L", "hips", 945, 585, 160, ["ai24-left-thigh"], -70, 70),
    bone("shinL", "Shin L", "thighL", 950, 740, 170, ["ai24-left-leg"], -145, 10),
    bone("footL", "Foot L", "shinL", 950, 905, 75, ["left_foot_"], -45, 45),
  ];

  const insert = (id: string, parent: string, x: number, y: number, children: string[]) => {
    bones.push(bone(id, id, parent, x, y, 0));
    for (const child of bones) if (children.includes(child.id)) child.parentId = id;
  };
  insert('spineLower', 'hips', 895, 535, ['torso']);
  insert('spineUpper', 'torso', 895, 370, []);
  insert('chest', 'spineUpper', 895, 310, ['neck']);
  for (const side of ['L', 'R']) {
    const arm = bones.find(b => b.id === `upperArm${side}`)!, hand = bones.find(b => b.id === `hand${side}`)!, foot = bones.find(b => b.id === `foot${side}`)!;
    insert(`clavicle${side}`, 'chest', arm.pivotX, arm.pivotY, [arm.id]);
    insert(`wrist${side}`, `forearm${side}`, hand.pivotX, hand.pivotY, [hand.id]);
    insert(`ankle${side}`, `shin${side}`, foot.pivotX, foot.pivotY, [foot.id]);
    hand.name = `Hand ${side}`;
    bones.push(bone(`elbowPole${side}`, `Elbow pole ${side}`, 'root', arm.pivotX + (side === 'L' ? 25 : -25), arm.pivotY+270, 0));
    bones.push(bone(`kneePole${side}`, `Knee pole ${side}`, 'root', foot.pivotX + (side === 'L' ? 95 : -95), 705, 0));
  }
  return {
    schemaVersion: 1,
    name: "Algowzxd Phase 1",
    seed: 381,
    character: { mode: 'hoodie', view: 'front', curvedLimbs: true, artworkUrl: "/production_character/illustrator2024/character.svg", assetRevision: 7, face: defaultFace(), calibration: defaultFaceCalibration(), faceAssets: { activeMouthPack: "v3", activeEyePack: "raster-v1", mouthOverrides: {}, eyeOverrides: {}, browOverrides: {} } },
    stage: { width: 1920, height: 1080, fps: 60, duration: 10, background: "#E8EDF2", backgroundMode: "solid" },
    audio: null,
    audioAnalysis: null,
    transcript: null,
    performance: null,
    performanceProfile: defaultPerformanceProfile(),
    rig: {
      bones,
      controllers: [
        ...bones.filter(b => /Pole/.test(b.id)).map(b => ({ id: `${b.id}Control`, name: b.name, boneId: b.id, kind: 'ik' as const, color: '#17bda7', size: 10, visible: true, locked: false })),
        { id: "rootControl", name: "Root Control", boneId: "root", kind: "transform", color: "#f7c843", size: 22, visible: true, locked: false },
        { id: "bodyControl", name: "Body Control", boneId: "torso", kind: "transform", color: "#42d3a7", size: 19, visible: true, locked: false },
        { id: "headControl", name: "Head Control", boneId: "head", kind: "transform", color: "#e76bff", size: 18, visible: true, locked: false },
        { id: "handRControl", name: "Hand R Control", boneId: "handR", kind: "ik", color: "#58a6ff", size: 16, visible: true, locked: false },
        { id: "handLControl", name: "Hand L Control", boneId: "handL", kind: "ik", color: "#58a6ff", size: 16, visible: true, locked: false },
        { id: "footRControl", name: "Foot R Control", boneId: "footR", kind: "ik", color: "#ff8b58", size: 16, visible: true, locked: false },
        { id: "footLControl", name: "Foot L Control", boneId: "footL", kind: "ik", color: "#ff8b58", size: 16, visible: true, locked: false },
      ],
    },
    animation: {
      tracks: [
        track("basePose", "Base Pose", "base"),
        track("manual", "Manual", "manual"),
      ],
    },
  };
}

export function replaceBone(project: ProjectDocument, id: string, nextBone: Bone): ProjectDocument {
  return {
    ...project,
    rig: { ...project.rig, bones: project.rig.bones.map((item) => (item.id === id ? nextBone : item)) },
  };
}

/** Add identity controls to old canonical rigs without discarding pivots or edits. */
export function upgradeBodyRig(project: ProjectDocument): ProjectDocument {
  if (!project.character.artworkUrl.includes('illustrator2024')) return project;
  const defaults = createDefaultProject(), ids = new Set(project.rig.bones.map(b => b.id));
  const added = defaults.rig.bones.filter(b => !ids.has(b.id));
  const bones = project.rig.bones.map(b => {
    const next = defaults.rig.bones.find(d => d.id === b.id);
    return next?.parentId && added.some(a => a.id === next.parentId) ? { ...b, parentId: next.parentId } : b;
  });
  return { ...project, character: { mode: 'hoodie', view: 'front', curvedLimbs: true, ...project.character }, rig: { bones: [...bones, ...added], controllers: [...project.rig.controllers, ...defaults.rig.controllers.filter(c => !project.rig.controllers.some(old => old.id === c.id))] } };
}
