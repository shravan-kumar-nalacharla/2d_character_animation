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
export type MouthShape = "closed" | "aa" | "ee" | "oh" | "uh" | "smile" | "teeth" | "wide" | "f" | "m" | "l" | "frown";
export type EyeExpression = "neutral" | "sad" | "cunning" | "serious" | "curiousLeft" | "curiousMiddle" | "curiousRight" | "angry" | "shocked" | "closed" | "lookLeft" | "lookRight";
export type FacePartName = "eyeL" | "eyeR" | "browL" | "browR" | "highlightL" | "highlightR";
export interface FacePartTransform {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
}
export interface FaceState {
    gazeX: number;
    gazeY: number;
    blink: number;
    mouth: MouthShape;
    eyeExpression: EyeExpression;
    parts: Record<FacePartName, FacePartTransform>;
    mouthParts: Record<MouthShape, FacePartTransform>;
    previewAutomation: boolean;
}
export type Interpolation = "hold" | "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bezier";
export type KeyframeValue = number | string | boolean;
export interface AnimationKeyframe {
    id: string;
    time: number;
    value: KeyframeValue;
    interpolation: Interpolation;
    easing?: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
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
    envelope: Array<{
        time: number;
        rms: number;
    }>;
    speechRegions: Array<{
        start: number;
        end: number;
    }>;
    pauses: Array<{
        start: number;
        end: number;
    }>;
    emphasisPeaks: Array<{
        time: number;
        strength: number;
    }>;
}
export interface TranscriptWord {
    id: string;
    text: string;
    start: number;
    end: number;
    confidence?: number;
    source: "transcription" | "alignment" | "estimated";
}
export interface TranscriptSegment {
    id: string;
    text: string;
    start: number;
    end: number;
    words: TranscriptWord[];
}
export interface TimedTranscript {
    version: 1;
    language: string;
    segments: TranscriptSegment[];
    diagnostics?: Array<{
        level: "repair" | "discard";
        segmentIndex: number;
        wordIndex?: number;
        reason: string;
        raw?: unknown;
    }>;
}
export type Emotion = "neutral" | "happy" | "amused" | "excited" | "sad" | "angry" | "frustrated" | "surprised" | "shocked" | "worried" | "confused" | "thinking" | "suspicious" | "embarrassed" | "proud" | "disgusted" | "tired";
export type Intent = "statement" | "question" | "explanation" | "agreement" | "disagreement" | "reaction" | "joke" | "sarcasm" | "disbelief" | "warning" | "complaint" | "storytelling" | "instruction" | "thinking" | "realization" | "greeting" | "conclusion";
export type GazeTarget = "camera" | "thinking-away" | "left" | "right" | "up" | "down";
export type HeadInstruction = "hold" | "tiny_nod" | "normal_nod" | "question_tilt" | "small_shake" | "disbelief_shake" | "reaction_back" | "reaction_forward" | "thinking_tilt" | "emphasis_forward" | "settle";
export interface PerformanceSegment {
    id: string;
    start: number;
    end: number;
    text: string;
    emotion: {
        primary: Emotion;
        secondary?: Emotion;
        intensity: number;
    };
    intent: Intent;
    expression: {
        preset: EyeExpression;
        intensity: number;
        transitionIn: number;
        transitionOut: number;
    };
    gaze: {
        target: GazeTarget;
        intensity: number;
    };
    eyebrowEvents: Array<{
        type: "raise" | "lower" | "one-brow" | "concern" | "surprise" | "angry";
        time: number;
        duration: number;
        strength: number;
    }>;
    headEvents: Array<{
        type: HeadInstruction;
        time: number;
        duration: number;
        strength: number;
    }>;
    bodyEvents: Array<{
        type: "hold" | "lean-forward" | "lean-back" | "speech-accent";
        time: number;
        duration: number;
        strength: number;
    }>;
    accents: Array<{
        text: string;
        start: number;
        end: number;
        importance: number;
        type: string;
    }>;
}
export interface PerformancePlan {
    version: 1;
    provider: "gemini" | "rule-based";
    promptVersion: "v1";
    overall: {
        language: string;
        mood: string;
        energy: number;
        speakingStyle: string;
    };
    segments: PerformanceSegment[];
    cache?: {
        audioHash: string;
        model: string;
        profileVersion: number;
        promptVersion: string;
        schemaVersion: number;
    };
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
}
export interface ProjectDocument {
    schemaVersion: 1;
    name: string;
    seed: number;
    character: {
        artworkUrl: string;
        assetRevision: number;
        face: FaceState;
    };
    stage: {
        width: number;
        height: number;
        fps: number;
        duration: number;
        background: string;
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
export declare function assertProject(value: unknown): asserts value is ProjectDocument;
