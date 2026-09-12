export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  artworkPrefixes: string[];
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  length: number;
  pivotX: number;
  pivotY: number;
  minRotation: number;
  maxRotation: number;
  stiffness: number;
  visible: boolean;
  locked: boolean;
}

export interface Controller {
  id: string;
  name: string;
  boneId: string;
  kind: "transform" | "ik" | "gaze" | "face";
  color: string;
  size: number;
  visible: boolean;
  locked: boolean;
}

export type ProductionViseme = "REST" | "MBP" | "FV" | "L" | "TDN" | "KG" | "CHJSH" | "SZ" | "R" | "AA" | "AEE" | "EEI" | "UH" | "OH" | "OOW";
export type MouthShape = ProductionViseme | "closed" | "aa" | "ee" | "oh" | "uh" | "smile" | "teeth" | "wide" | "f" | "m" | "l" | "frown";
export type EyeExpression = "neutral" | "friendly" | "soft" | "happy" | "happyClosed" | "laughClosed" | "closedSoft" | "blink" | "winkLeft" | "winkRight" | "sad" | "verySad" | "teary" | "crying" | "sobCrying" | "concerned" | "worried" | "fear" | "panic" | "shock" | "shocked" | "extremeShock" | "curious" | "confused" | "thinking" | "suspicious" | "cunning" | "unimpressed" | "bored" | "tired" | "sleepy" | "serious" | "focused" | "determined" | "coldGlare" | "angry" | "angrySqueezed" | "veryAngry" | "rage" | "shadowRage" | "disgusted" | "annoyed" | "embarrassed" | "awkward" | "nervous" | "excited" | "veryExcited" | "sparkleExcited" | "sparkleCute" | "pleading" | "proud" | "smug" | "deadpan" | "animeDetermined" | "animeShock" | "animeCute" | "closed" | "curiousLeft" | "curiousMiddle" | "curiousRight" | "lookLeft" | "lookRight";
export type EyeStyle = "simple" | "white" | "anime" | "sparkle" | "closed";
export type HighlightStyle = "none" | "single" | "double" | "sparkle";
export type BrowPreset = "auto" | "neutral" | "soft" | "raised" | "veryRaised" | "innerRaised" | "outerRaised" | "sad" | "concerned" | "worried" | "curious" | "suspicious" | "cunning" | "angry" | "veryAngry" | "serious" | "determined" | "excited" | "animeAngry";

export interface EyeSideState { expression: EyeExpression | "inherit"; scaleX: number; scaleY: number; openness: number; squint: number; rotation: number; pupilScale: number; pupilX: number; pupilY: number; highlightStyle: HighlightStyle | "auto" }
export interface BrowSideState { preset: BrowPreset; x: number; y: number; rotation: number; scaleX: number; scaleY: number; innerHeight: number; outerHeight: number; curve: number; intensity: number }
export interface SunglassesState { visible: boolean; style: "blackClassic"; scale: number; offsetX: number; offsetY: number; rotation: number; opacity: number }
export type FaceFxMode = "auto" | "none" | "angryShadow";
export type ExtraFaceFxMode = "auto" | "none" | "angerCross01" | "angerCross02" | "angerVein01";
export type TearMode = "auto" | "none" | "stream" | "waterfall";
export type CryState = "auto" | "off" | "watery" | "aboutToCry" | "firstTear" | "cryStream" | "cryingHard" | "waterfallExtreme";
export interface CryControls {
  state: CryState; enableShake: boolean; enableTears: boolean; shakeAmount: number; shakeFrequency: number;
  shakeVerticalRatio: number; shakeRotation: number; flowSpeed: number; turbulenceAmount: number;
  turbulenceSize: number; opacity: number; amount: number; showFaceMatte: boolean;
}
export type FacePartName = "eyeL" | "eyeR" | "browL" | "browR" | "highlightL" | "highlightR";

export interface FacePartTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation?: number;
}

export interface FaceAssetOverride { name: string; mimeType: "image/svg+xml" | "image/png" | "image/webp"; dataUrl: string; updatedAt: string }
export interface FaceAssetState { activeMouthPack: string; activeEyePack: "raster-v1" | "modular-v2" | "classic" | "expressive" | "anime-comedy" | "custom"; modularExpressionV2?: string; mouthOverrides: Partial<Record<MouthShape, FaceAssetOverride>>; eyeOverrides: Partial<Record<EyeExpression, { left?: FaceAssetOverride; right?: FaceAssetOverride }>>; browOverrides: Partial<Record<BrowPreset, { left?: FaceAssetOverride; right?: FaceAssetOverride }>> }

export interface FaceState {
  gazeX: number;
  gazeY: number;
  blink: number;
  eyeOpenness: number;
  mouth: MouthShape;
  mouthOffsetX: number;
  mouthOffsetY: number;
  mouthRotation: number;
  jawOpen: number;
  mouthWidth: number;
  lipRound: number;
  lipPress: number;
  mouthIntensity: number;
  eyeExpression: EyeExpression;
  eyeSystem: { left: EyeSideState; right: EyeSideState };
  browSystem: { left: BrowSideState; right: BrowSideState };
  accessories: { sunglasses: SunglassesState };
  faceFx: FaceFxMode;
  extraFaceFx: ExtraFaceFxMode;
  tears: TearMode;
  cryControls: CryControls;
  hairStyle: "canonical";
  parts: Record<FacePartName, FacePartTransform>;
  mouthParts: Record<MouthShape, FacePartTransform>;
  previewAutomation: boolean;
}

export interface FaceCalibration {
  eyeVisualScale: number;
  mouthVisualScale: number;
  gazeRangeX: number;
  gazeRangeY: number;
  eyeOpennessStrength: number;
  expressionStrength: number;
  headRotationStrength: number;
  headTranslationStrength: number;
  maxNormalRotation: number;
  maxReactionRotation: number;
  gazeReturnSpeed: number;
  headFollowStrength: number;
  parallaxStrength: number;
  showNeckAnchor: boolean;
  showHeadPivot: boolean;
  showEyeCenters: boolean;
  showGazeBounds: boolean;
  showCurrentGaze: boolean;
  showMouthAnchor: boolean;
  showEyeScaleBounds: boolean;
  showLanguageMap: boolean;
}

export type Interpolation = "hold" | "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bezier";
export type KeyframeValue = number | string | boolean;

export interface AnimationKeyframe {
  id: string;
  time: number;
  value: KeyframeValue;
  interpolation: Interpolation;
  easing?: { x1: number; y1: number; x2: number; y2: number };
  source: "manual" | "auto-lipsync" | "ai-performance" | "rule-performance" | "procedural";
  strength?: number;
}

export interface AnimationTrack {
  id: string;
  name: string;
  layer: "base" | "manual" | "lipSync" | "aiExpression" | "aiEyebrows" | "aiGaze" | "blink" | "aiHead" | "speechMotion" | "idle";
  target: string;
  valueType: "number" | "string" | "boolean";
  muted: boolean;
  locked: boolean;
  generated: boolean;
  keyframes: AnimationKeyframe[];
  metadata?: Record<string, unknown>;
}

export interface AudioSource {
  name: string;
  mimeType: string;
  size: number;
  duration: number;
  hash: string;
}

export interface AudioAnalysis {
  version: 1;
  duration: number;
  sampleRate: number;
  peak: number;
  averageRms: number;
  waveform: number[];
  envelope: Array<{ time: number; rms: number }>;
  speechRegions: Array<{ start: number; end: number }>;
  pauses: Array<{ start: number; end: number }>;
  emphasisPeaks: Array<{ time: number; strength: number }>;
}

export type LanguageCode = "en" | "hi" | "te";
export interface TranscriptWord { id: string; text: string; start: number; end: number; confidence?: number; source: "transcription" | "alignment" | "estimated"; language?: LanguageCode; script?: "native" | "romanized" | "latin" | "unknown" }
export interface TranscriptSegment { id: string; text: string; start: number; end: number; words: TranscriptWord[]; language?: LanguageCode }
export interface TimedTranscript { version: 1; language: string; segments: TranscriptSegment[]; diagnostics?: Array<{ level: "repair" | "discard"; segmentIndex: number; wordIndex?: number; reason: string; raw?: unknown }> }

export type Emotion = "neutral" | "happy" | "amused" | "excited" | "sad" | "angry" | "frustrated" | "surprised" | "shocked" | "worried" | "confused" | "thinking" | "suspicious" | "embarrassed" | "proud" | "disgusted" | "tired";
export type Intent = "statement" | "question" | "explanation" | "agreement" | "disagreement" | "reaction" | "joke" | "sarcasm" | "disbelief" | "warning" | "complaint" | "storytelling" | "instruction" | "thinking" | "realization" | "greeting" | "conclusion";
export type GazeTarget = "camera" | "return-camera" | "thinking-away" | "thinking-left" | "thinking-right" | "reaction-left" | "reaction-right" | "slightly-left" | "slightly-right" | "up-left" | "up-right" | "down-left" | "down-right" | "left" | "right" | "up" | "down";
export type HeadInstruction = "hold" | "tiny_nod" | "micro_nod" | "normal_nod" | "strong_nod" | "question_tilt" | "question_tilt_left" | "question_tilt_right" | "confused_tilt" | "small_turn_left" | "small_turn_right" | "thinking_turn" | "small_shake" | "disagreement_shake" | "disbelief_shake" | "reaction_back" | "surprise_recoil" | "reaction_forward" | "thinking_tilt" | "emphasis_forward" | "emphasis_down" | "settle" | "settle_to_neutral";

export interface PerformanceSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  emotion: { primary: Emotion; secondary?: Emotion; intensity: number };
  intent: Intent;
  expression: { preset: EyeExpression; intensity: number; transitionIn: number; transitionOut: number };
  gaze: { target: GazeTarget; intensity: number };
  eyebrowEvents: Array<{ type: "raise" | "lower" | "one-brow" | "concern" | "surprise" | "angry"; time: number; duration: number; strength: number }>;
  headEvents: Array<{ type: HeadInstruction; time: number; duration: number; strength: number }>;
  bodyEvents: Array<{ type: "hold" | "lean-forward" | "lean-back" | "speech-accent"; time: number; duration: number; strength: number }>;
  accents: Array<{ text: string; start: number; end: number; importance: number; type: string }>;
}

export interface PerformancePlan {
  version: 1;
  provider: "gemini" | "rule-based";
  promptVersion: "v1";
  overall: { language: string; mood: string; energy: number; speakingStyle: string };
  segments: PerformanceSegment[];
  cache?: { audioHash: string; model: string; profileVersion: number; promptVersion: string; schemaVersion: number };
}

export interface CharacterPerformanceProfile {
  preset: "Calm" | "Natural" | "YouTube" | "Energetic" | "Comedy" | "Custom";
  defaultEnergy: number;
  expressionStrength: number;
  mouthStrength: number;
  eyeActivity: number;
  eyebrowActivity: number;
  headMotion: number;
  bodyMotion: number;
  emotionStrength: number;
  animationSmoothness: number;
  comedicExaggeration: number;
  performanceDensity: number;
  head: { motionStrength: number; neckPivotRequired: boolean; maxNormalRotation: number; maxReactionRotation: number; minimumPoseDuration: number; eventCooldown: number };
  eyes: { visualScale: number; horizontalGazeStrength: number; verticalGazeStrength: number; minimumGazeDuration: number; transitionDuration: number; returnDuration: number };
  mouth: { visualScale: number };
  lipSync: { density: number; preset: "Precise" | "Natural" | "Cartoon" | "Mumble"; minimumVisemeDuration: number; coarticulation: number };
}

export interface ProjectDocument {
  schemaVersion: 1;
  name: string;
  seed: number;
  character: {
    artworkUrl: string;
    assetRevision: number;
    face: FaceState;
    calibration: FaceCalibration;
    faceAssets: FaceAssetState;
  };
  stage: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    background: string;
    backgroundMode?: "solid" | "transparent";
  };
  audio: AudioSource | null;
  audioAnalysis: AudioAnalysis | null;
  transcript: TimedTranscript | null;
  performance: PerformancePlan | null;
  performanceProfile: CharacterPerformanceProfile;
  rig: {
    bones: Bone[];
    controllers: Controller[];
  };
  animation: {
    tracks: AnimationTrack[];
  };
}

export function assertProject(value: unknown): asserts value is ProjectDocument {
  if (!value || typeof value !== "object") throw new Error("Project is not an object.");
  const project = value as Partial<ProjectDocument>;
  if (project.schemaVersion !== 1) throw new Error("Unsupported project version.");
  if (!project.rig || !Array.isArray(project.rig.bones)) throw new Error("Project rig is missing.");
  if (!project.stage || typeof project.stage.width !== "number") throw new Error("Project stage is missing.");
}
