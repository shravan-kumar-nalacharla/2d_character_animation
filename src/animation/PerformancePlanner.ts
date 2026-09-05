import type { AnimationKeyframe, AnimationTrack, AudioAnalysis, AudioSource, CharacterPerformanceProfile, LanguageCode, MouthShape, PerformancePlan, TimedTranscript } from "../project/schema";
import { VisemeMapper } from "../character/VisemeMapper";
import { VisemeSequenceOptimizer, type OptimizedViseme, type VisemeOptimizationDiagnostics } from "./VisemeSequenceOptimizer";
import { sanitizeMotionTracks } from "./MotionQuality";

export interface VisemeCue { start: number; end: number; viseme: MouthShape; strength: number; sourceText: string }
export interface PhonemeAlignmentProvider { align(audio: AudioSource, transcript: TimedTranscript, analysis: AudioAnalysis): Promise<VisemeCue[]> }

export class TranscriptHeuristicAlignmentProvider implements PhonemeAlignmentProvider {
  async align(_audio: AudioSource, transcript: TimedTranscript, analysis: AudioAnalysis): Promise<VisemeCue[]> {
    const cues = transcript.segments.flatMap((segment) => segment.words.flatMap((word) => wordVisemes(word.text, word.start, word.end, analysis, word.language ?? "en")));
    return cues;
  }
}

export interface PlannerOptions { lipSync: boolean; expressions: boolean; eyes: boolean; eyebrows: boolean; head: boolean; blink: boolean; body: boolean }
export const allPlannerOptions: PlannerOptions = { lipSync: true, expressions: true, eyes: true, eyebrows: true, head: true, blink: true, body: true };

export async function planAnimation(audio: AudioSource, transcript: TimedTranscript, analysis: AudioAnalysis, performance: PerformancePlan, profile: CharacterPerformanceProfile, seed: number, options: PlannerOptions = allPlannerOptions): Promise<AnimationTrack[]> {
  const tracks: AnimationTrack[] = [];
  if (options.lipSync) { const raw = await new TranscriptHeuristicAlignmentProvider().align(audio, transcript, analysis), optimized = new VisemeSequenceOptimizer().optimize(raw, transcript, profile); tracks.push(mouthTrack(optimized.events, profile, optimized.diagnostics, raw), ...continuousMouthTracks(optimized.events)); }
  if (options.expressions) tracks.push(...expressionTracks(performance), eyeOpennessTrack(performance), ...mouthPerformanceTracks(performance));
  if (options.eyes) tracks.push(...gazeTracks(performance, profile));
  if (options.eyebrows) tracks.push(...eyebrowTracks(performance, profile));
  if (options.head) tracks.push(...headTracks(performance, profile));
  if (options.body) tracks.push(bodyTrack(performance, profile), pauseBreathingTrack(analysis));
  if (options.blink) tracks.push(blinkTrack(audio.duration, performance, seed));
  return sanitizeMotionTracks(tracks.filter((track) => track.keyframes.length > 0));
}

function mouthTrack(cues: OptimizedViseme[], profile: CharacterPerformanceProfile, diagnostics: VisemeOptimizationDiagnostics, raw: VisemeCue[]): AnimationTrack {
  const keys: AnimationKeyframe[] = [key("mouth-rest", 0, "REST", "hold", "auto-lipsync")];
  cues.forEach((cue, index) => {
    keys.push(key(`mouth-${index}-in`, cue.apex, cue.viseme, "hold", "auto-lipsync", Math.min(1, cue.strength * profile.mouthStrength)));
    if (index === cues.length - 1 || cues[index + 1].onset - cue.offset > 0.09) keys.push(key(`mouth-${index}-rest`, cue.offset, "REST", "hold", "auto-lipsync"));
  });
  return track("auto-mouth", "Mouth / Optimized Viseme", "lipSync", "face.mouth", "string", keys, { visemeOptimization: diagnostics, rawSequence: raw.map((cue) => ({ viseme: cue.viseme, start: cue.start, end: cue.end })), optimizedSequence: cues.map((cue) => ({ viseme: cue.viseme, onset: cue.onset, apex: cue.apex, offset: cue.offset })) });
}

function continuousMouthTracks(cues: OptimizedViseme[]): AnimationTrack[] {
  const properties = ["jawOpen", "mouthWidth", "lipRound", "lipPress", "mouthIntensity"] as const;
  const values: Record<typeof properties[number], AnimationKeyframe[]> = Object.fromEntries(properties.map((property) => [property, [key(`${property}-rest`, 0, 0, "bezier", "auto-lipsync", undefined, mouthEase)]])) as Record<typeof properties[number], AnimationKeyframe[]>;
  const target = (cue: OptimizedViseme) => ({ jawOpen: ({ REST: 0, MBP: .02, FV: .16, L: .48, TDN: .38, KG: .55, CHJSH: .48, SZ: .3, R: .42, AA: .95, AEE: .62, EEI: .34, UH: .5, OH: .8, OOW: .38 } as Record<string, number>)[cue.viseme], mouthWidth: ({ AEE: .68, EEI: 1, SZ: .55, AA: .2, MBP: .1 } as Record<string, number>)[cue.viseme] ?? .3, lipRound: ({ OH: 1, OOW: 1, UH: .72, R: .52, CHJSH: .38 } as Record<string, number>)[cue.viseme] ?? 0, lipPress: cue.viseme === "MBP" ? 1 : cue.viseme === "FV" ? .62 : 0, mouthIntensity: cue.strength });
  cues.forEach((cue, index) => { const current = target(cue), previous = cues[index - 1] ? target(cues[index - 1]) : undefined, next = cues[index + 1] ? target(cues[index + 1]) : undefined; for (const property of properties) values[property].push(key(`${property}-${index}-onset`, cue.onset, (previous?.[property] ?? 0) * .35, "bezier", "auto-lipsync", undefined, mouthEase), key(`${property}-${index}-apex`, cue.apex, current[property], "bezier", "auto-lipsync", undefined, mouthEase), key(`${property}-${index}-offset`, cue.offset, (next?.[property] ?? 0) * .4, "bezier", "auto-lipsync", undefined, settleEase)); });
  return properties.map((property) => track(`auto-${property}`, `Mouth · ${property}`, "lipSync", `face.${property}`, "number", dedupe(values[property])));
}

function expressionTracks(plan: PerformancePlan): AnimationTrack[] {
  const keys: AnimationKeyframe[] = [key("expression-rest", 0, "neutral", "hold", source(plan))];
  let previous = "neutral";
  for (const segment of plan.segments) {
    const next = canonicalEyeExpression(segment.expression.preset);
    if (next !== previous && (next !== "neutral" || segment.expression.intensity > 0.45)) keys.push(key(`${segment.id}-expression`, segment.start + Math.min(0.12, segment.expression.transitionIn), next, "hold", source(plan), segment.expression.intensity));
    previous = next;
  }
  const last = plan.segments.at(-1); if (last && previous !== "neutral") keys.push(key("expression-final-rest", last.end + 0.25, "neutral", "hold", source(plan)));
  const shared = dedupe(keys);
  return [
    track("auto-expression-left", "AI Expression · Left Eye", "aiExpression", "face.eyeSystem.left.expression", "string", shared.map((item) => ({ ...item, id: `${item.id}-left` }))),
    track("auto-expression-right", "AI Expression · Right Eye", "aiExpression", "face.eyeSystem.right.expression", "string", shared.map((item) => ({ ...item, id: `${item.id}-right` }))),
  ];
}

function eyeOpennessTrack(plan: PerformancePlan): AnimationTrack {
  const keys = [key("eye-open-rest", 0, 1, "bezier", source(plan), undefined, gazeEase)];
  for (const segment of plan.segments) {
    const value = segment.emotion.primary === "shocked" || segment.emotion.primary === "surprised" ? 1.16 : segment.emotion.primary === "sad" || segment.emotion.primary === "tired" ? 0.78 : segment.emotion.primary === "angry" ? 0.88 : 1;
    keys.push(key(`${segment.id}-eye-open`, segment.start + 0.05, value, "bezier", source(plan), segment.expression.intensity, gazeEase), key(`${segment.id}-eye-open-out`, segment.end, 1, "bezier", source(plan), undefined, settleEase));
  }
  return track("auto-eye-openness", "Eyes · Openness", "aiExpression", "face.eyeOpenness", "number", dedupe(keys));
}

function mouthPerformanceTracks(plan: PerformancePlan): AnimationTrack[] {
  const x = [key("mouth-offset-x-rest", 0, 0, "bezier", source(plan), undefined, settleEase)], y = [key("mouth-offset-y-rest", 0, 0, "bezier", source(plan), undefined, settleEase)], rotation = [key("mouth-rotation-rest", 0, 0, "bezier", source(plan), undefined, settleEase)];
  plan.segments.forEach((segment, index) => {
    const acting = ["suspicious", "confused", "thinking"].includes(segment.emotion.primary) || ["sarcasm", "disbelief"].includes(segment.intent);
    if (!acting) return;
    const sign = index % 2 ? -1 : 1, start = segment.start + 0.12, end = Math.max(start + 0.25, segment.end - 0.12), amount = Math.min(3.2, 1.2 + segment.emotion.intensity * 2);
    x.push(key(`${segment.id}-mouth-x`, start, sign * amount, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-mouth-x-out`, end, 0, "bezier", source(plan), undefined, settleEase));
    y.push(key(`${segment.id}-mouth-y`, start, segment.emotion.primary === "thinking" ? 1 : 0, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-mouth-y-out`, end, 0, "bezier", source(plan), undefined, settleEase));
    rotation.push(key(`${segment.id}-mouth-r`, start, sign * 2.2, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-mouth-r-out`, end, 0, "bezier", source(plan), undefined, settleEase));
  });
  return [track("auto-mouth-offset-x", "Mouth · Acting X", "aiExpression", "face.mouthOffsetX", "number", dedupe(x)), track("auto-mouth-offset-y", "Mouth · Acting Y", "aiExpression", "face.mouthOffsetY", "number", dedupe(y)), track("auto-mouth-rotation", "Mouth · Acting Rotation", "aiExpression", "face.mouthRotation", "number", dedupe(rotation))];
}

function gazeTracks(plan: PerformancePlan, profile: CharacterPerformanceProfile): AnimationTrack[] {
  const x: AnimationKeyframe[] = [key("gaze-x-rest", 0, 0, "ease-in-out", source(plan))];
  const y: AnimationKeyframe[] = [key("gaze-y-rest", 0, 0, "ease-in-out", source(plan))];
  let availableAt = 0;
  plan.segments.forEach((segment, index) => {
    const amount = segment.gaze.intensity;
    const target = segment.gaze.target;
    const expressive = ["thinking-away", "up", "down", "left", "right"].some((value) => target.includes(value)) || segment.emotion.intensity > .72;
    if (!expressive || segment.start < availableAt) return;
    const left = target.includes("left") || target === "thinking-away" && index % 2 === 0;
    const right = target.includes("right") || target === "thinking-away" && index % 2 === 1;
    const subtle = target.startsWith("slightly-") ? 0.55 : 1;
    const gx = clampRange((left ? -amount : right ? amount : 0) * subtle * profile.eyes.horizontalGazeStrength, -1, 1);
    const up = target === "up" || target.startsWith("up-") || target.startsWith("thinking-") || target === "thinking-away";
    const down = target === "down" || target.startsWith("down-");
    const gy = clampRange((up ? -amount * 0.65 : down ? amount * 0.65 : 0) * profile.eyes.verticalGazeStrength, -1, 1);
    const onset = segment.start + .03;
    const apex = onset + profile.eyes.transitionDuration;
    const minimumHold = target === "thinking-away" ? Math.max(.8, profile.eyes.minimumGazeDuration) : profile.eyes.minimumGazeDuration;
    const hold = Math.max(apex + minimumHold, segment.end - profile.eyes.returnDuration);
    const offset = hold + profile.eyes.returnDuration;
    x.push(key(`${segment.id}-gaze-x-onset`, onset, 0, "bezier", source(plan), undefined, gazeEase), key(`${segment.id}-gaze-x-apex`, apex, gx, "bezier", source(plan), undefined, gazeEase), key(`${segment.id}-gaze-x-hold`, hold, gx, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-gaze-x-out`, offset, 0, "bezier", source(plan), undefined, settleEase));
    y.push(key(`${segment.id}-gaze-y-onset`, onset, 0, "bezier", source(plan), undefined, gazeEase), key(`${segment.id}-gaze-y-apex`, apex, gy, "bezier", source(plan), undefined, gazeEase), key(`${segment.id}-gaze-y-hold`, hold, gy, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-gaze-y-out`, offset, 0, "bezier", source(plan), undefined, settleEase));
    availableAt = offset + .18;
  });
  return [track("auto-gaze-x", "Eyes · Gaze X", "aiGaze", "face.gazeX", "number", dedupe(x)), track("auto-gaze-y", "Eyes · Gaze Y", "aiGaze", "face.gazeY", "number", dedupe(y))];
}

function eyebrowTracks(plan: PerformancePlan, profile: CharacterPerformanceProfile): AnimationTrack[] {
  const left: AnimationKeyframe[] = [key("brow-l-rest", 0, 0, "ease-out", source(plan))];
  const right: AnimationKeyframe[] = [key("brow-r-rest", 0, 0, "ease-out", source(plan))];
  const leftPreset: AnimationKeyframe[] = [key("brow-l-preset-rest", 0, "neutral", "hold", source(plan))];
  const rightPreset: AnimationKeyframe[] = [key("brow-r-preset-rest", 0, "neutral", "hold", source(plan))];
  plan.segments.forEach((segment, index) => {
    const preset = browPresetFor(canonicalEyeExpression(segment.expression.preset));
    const asymmetric = ["curious", "confused", "suspicious", "cunning", "smug"].includes(canonicalEyeExpression(segment.expression.preset));
    leftPreset.push(key(`${segment.id}-brow-l-preset`, segment.start + .04, asymmetric && index % 2 === 0 ? "raised" : preset, "hold", source(plan), segment.expression.intensity));
    rightPreset.push(key(`${segment.id}-brow-r-preset`, segment.start + .04, asymmetric && index % 2 === 1 ? "raised" : preset, "hold", source(plan), segment.expression.intensity));
  });
  for (const segment of plan.segments) for (const [index, event] of segment.eyebrowEvents.entries()) {
    const direction = event.type === "lower" || event.type === "angry" ? 1 : -1;
    const amount = direction * event.strength * profile.eyebrowActivity * 7;
    const anticipation = Math.max(segment.start, event.time - 0.08);
    left.push(key(`${segment.id}-brow-l-${index}-a`, anticipation, 0, "ease-out", source(plan)), key(`${segment.id}-brow-l-${index}`, event.time, amount, "ease-out", source(plan)), key(`${segment.id}-brow-l-${index}-out`, event.time + event.duration, 0, "ease-in-out", source(plan)));
    const rightAmount = event.type === "one-brow" ? 0 : amount;
    right.push(key(`${segment.id}-brow-r-${index}-a`, anticipation, 0, "ease-out", source(plan)), key(`${segment.id}-brow-r-${index}`, event.time, rightAmount, "ease-out", source(plan)), key(`${segment.id}-brow-r-${index}-out`, event.time + event.duration, 0, "ease-in-out", source(plan)));
  }
  return [
    track("auto-brow-l-preset", "Eyebrow L · Preset", "aiEyebrows", "face.browSystem.left.preset", "string", dedupe(leftPreset)),
    track("auto-brow-r-preset", "Eyebrow R · Preset", "aiEyebrows", "face.browSystem.right.preset", "string", dedupe(rightPreset)),
    track("auto-brow-l", "Eyebrow L · Motion", "aiEyebrows", "face.parts.browL.y", "number", dedupe(left)),
    track("auto-brow-r", "Eyebrow R · Motion", "aiEyebrows", "face.parts.browR.y", "number", dedupe(right)),
  ];
}

function headTracks(plan: PerformancePlan, profile: CharacterPerformanceProfile): AnimationTrack[] {
  const neckRotation: AnimationKeyframe[] = [key("neck-rotation-rest", 0, 0, "ease-in-out", source(plan))];
  const headRotation: AnimationKeyframe[] = [key("head-rotation-rest", 0, 0, "ease-in-out", source(plan))];
  const x: AnimationKeyframe[] = [key("neck-x-rest", 0, 0, "ease-in-out", source(plan))];
  const y: AnimationKeyframe[] = [key("neck-y-rest", 0, 0, "ease-in-out", source(plan))];
  let availableAt = 0;
  for (const segment of plan.segments) for (const [index, event] of segment.headEvents.entries()) {
    if (event.time < availableAt) continue;
    const strength = event.strength * profile.headMotion * profile.head.motionStrength;
    const isReaction = event.type.includes("reaction") || event.type === "surprise_recoil" || event.type.includes("disbelief");
    const limit = isReaction ? profile.head.maxReactionRotation : profile.head.maxNormalRotation;
    const sign = event.type.endsWith("_left") ? -1 : event.type.endsWith("_right") ? 1 : index % 2 ? -1 : 1;
    const rotationBase = event.type.includes("tilt") ? 6.5 : event.type.includes("turn") ? 5 : event.type.includes("shake") ? 7.5 : event.type.includes("nod") || event.type.includes("emphasis") ? 2.2 : event.type.includes("reaction") || event.type === "surprise_recoil" ? 4 : 0;
    const rotationValue = clampRange(sign * rotationBase * strength, -limit, limit);
    const yValue = (event.type === "reaction_back" || event.type === "surprise_recoil" ? -8 : event.type === "reaction_forward" || event.type === "emphasis_forward" || event.type === "emphasis_down" ? 7 : event.type.includes("nod") ? 4.5 : 0) * strength;
    const xValue = (event.type.includes("turn") ? sign * 4 : event.type.includes("shake") ? sign * 2.5 : 0) * strength;
    const duration = Math.max(profile.head.minimumPoseDuration, event.duration);
    const anticipation = Math.max(segment.start, event.time - .12);
    const apex = event.time + Math.min(.22, duration * .3);
    const hold = event.time + duration * .74;
    const offset = event.time + duration;
    const neckShare = .3, headShare = .7, overshoot = isReaction ? 1.08 : 1;
    const addRotationPose = (keys: AnimationKeyframe[], share: number, label: string) => keys.push(key(`${segment.id}-${label}-${index}-a`, anticipation, -rotationValue * share * .16, "bezier", source(plan), undefined, headEase), key(`${segment.id}-${label}-${index}-peak`, apex, rotationValue * share * overshoot, "bezier", source(plan), undefined, headEase), key(`${segment.id}-${label}-${index}-hold`, hold, rotationValue * share, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-${label}-${index}-out`, offset, 0, "bezier", source(plan), undefined, settleEase));
    addRotationPose(neckRotation, neckShare, "neck-r"); addRotationPose(headRotation, headShare, "head-r");
    y.push(key(`${segment.id}-head-y-${index}-a`, anticipation, -yValue * .12, "bezier", source(plan), undefined, headEase), key(`${segment.id}-head-y-${index}-peak`, apex, yValue * overshoot, "bezier", source(plan), undefined, headEase), key(`${segment.id}-head-y-${index}-hold`, hold, yValue, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-head-y-${index}-out`, offset, 0, "bezier", source(plan), undefined, settleEase));
    x.push(key(`${segment.id}-head-x-${index}-a`, anticipation, -xValue * .12, "bezier", source(plan), undefined, headEase), key(`${segment.id}-head-x-${index}-peak`, apex, xValue * overshoot, "bezier", source(plan), undefined, headEase), key(`${segment.id}-head-x-${index}-hold`, hold, xValue, "bezier", source(plan), undefined, settleEase), key(`${segment.id}-head-x-${index}-out`, offset, 0, "bezier", source(plan), undefined, settleEase));
    availableAt = offset + profile.head.eventCooldown;
  }
  return [track("auto-neck-rotation", "Head · Neck Rotation (30%)", "aiHead", "bone.neck.rotation", "number", dedupe(neckRotation)), track("auto-head-rotation", "Head · Head Rotation (70%)", "aiHead", "bone.head.rotation", "number", dedupe(headRotation)), track("auto-head-x", "Head · Neck X", "aiHead", "bone.neck.x", "number", dedupe(x)), track("auto-head-y", "Head · Neck Y", "aiHead", "bone.neck.y", "number", dedupe(y))];
}

function bodyTrack(plan: PerformancePlan, profile: CharacterPerformanceProfile): AnimationTrack {
  const keys: AnimationKeyframe[] = [key("body-rest", 0, 0, "ease-in-out", source(plan))];
  for (const segment of plan.segments) for (const [index, event] of segment.bodyEvents.entries()) {
    const amount = (event.type === "lean-back" ? -1 : 1) * event.strength * profile.bodyMotion * 6;
    keys.push(key(`${segment.id}-body-${index}`, event.time, amount, "bezier", source(plan)), key(`${segment.id}-body-${index}-out`, event.time + event.duration, 0, "ease-in-out", source(plan)));
  }
  return track("auto-body-y", "Body · Speech Motion", "speechMotion", "bone.torso.y", "number", dedupe(keys));
}

function pauseBreathingTrack(analysis: AudioAnalysis): AnimationTrack {
  const keys: AnimationKeyframe[] = [key("breath-rest", 0, 0, "bezier", "procedural", undefined, settleEase)];
  analysis.pauses.filter((pause) => pause.end - pause.start >= .5).forEach((pause, index) => {
    const midpoint = pause.start + (pause.end - pause.start) * .55;
    keys.push(key(`breath-${index}-in`, pause.start, 0, "bezier", "procedural", undefined, settleEase), key(`breath-${index}-apex`, midpoint, -1.4, "bezier", "procedural", undefined, settleEase), key(`breath-${index}-out`, pause.end, 0, "bezier", "procedural", undefined, settleEase));
  });
  return track("auto-pause-breathing", "Body · Pause Breathing", "speechMotion", "bone.torso.y", "number", dedupe(keys));
}

function blinkTrack(duration: number, plan: PerformancePlan, seed: number): AnimationTrack {
  const random = mulberry32(seed);
  const keys: AnimationKeyframe[] = [key("blink-rest", 0, 0, "ease-in-out", "procedural")];
  let time = 1.8 + random() * 2.5;
  let index = 0;
  while (time < duration) {
    const suppressed = plan.segments.some((segment) => segment.start <= time && segment.end >= time && (segment.emotion.primary === "surprised" || segment.emotion.primary === "shocked") && segment.emotion.intensity > 0.65);
    if (!suppressed) {
      keys.push(key(`blink-${index}-start`, time, 0, "ease-in", "procedural"), key(`blink-${index}-closed`, time + 0.07, 1, "ease-in-out", "procedural"), key(`blink-${index}-open`, time + 0.16, 0, "ease-out", "procedural"));
      index++;
    }
    time += 2.2 + random() * 3.8;
  }
  return track("auto-blink", "Eyes · Blink", "blink", "face.blink", "number", keys);
}

export function wordVisemes(text: string, start: number, end: number, analysis: AudioAnalysis, language: LanguageCode = "en"): VisemeCue[] {
  const units = text.toLowerCase().match(/ch|sh|th|ph|bh|dh|kh|gh|aa|ee|oo|ai|au|[a-z]|[\u0900-\u097f]|[\u0c00-\u0c7f]/g) ?? [];
  if (!units.length) return [];
  const span = (end - start) / units.length;
  return units.map((unit, index) => {
    const cueStart = start + span * index;
    return { start: cueStart, end: cueStart + span, viseme: VisemeMapper.fromUnit(unit, language), strength: 0.68 + nearbyEnergy(analysis, cueStart) * 0.25, sourceText: unit };
  });
}

function nearbyEnergy(analysis: AudioAnalysis, time: number) {
  const closest = analysis.envelope.reduce((best, item) => Math.abs(item.time - time) < Math.abs(best.time - time) ? item : best, analysis.envelope[0] ?? { time: 0, rms: 0 });
  return Math.min(1, analysis.peak ? closest.rms / analysis.peak * 2 : 0);
}

function clampRange(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function track(id: string, name: string, layer: AnimationTrack["layer"], target: string, valueType: AnimationTrack["valueType"], keyframes: AnimationKeyframe[], metadata?: Record<string, unknown>): AnimationTrack {
  return { id, name, layer, target, valueType, muted: false, locked: false, generated: true, keyframes, metadata };
}

function key(id: string, time: number, value: AnimationKeyframe["value"], interpolation: AnimationKeyframe["interpolation"], sourceValue: AnimationKeyframe["source"], strength?: number, easing?: AnimationKeyframe["easing"]): AnimationKeyframe {
  return { id, time: Math.max(0, Number(time.toFixed(4))), value, interpolation, easing: interpolation === "bezier" ? easing ?? { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } : undefined, source: sourceValue, strength };
}

function dedupe(keys: AnimationKeyframe[]) {
  return keys.sort((a, b) => a.time - b.time).filter((item, index, all) => index === 0 || item.time - all[index - 1].time > 0.001 || item.value !== all[index - 1].value);
}

function source(plan: PerformancePlan): AnimationKeyframe["source"] { return plan.provider === "gemini" ? "ai-performance" : "rule-performance"; }
function canonicalEyeExpression(value: PerformancePlan["segments"][number]["expression"]["preset"]) { if (value.startsWith("curious")) return "curious"; if (value === "lookLeft" || value === "lookRight" || value === "closed") return "neutral"; return value; }
function browPresetFor(expression: string) {
  if (["sad", "verySad", "teary"].includes(expression)) return "sad";
  if (["crying", "sobCrying", "concerned"].includes(expression)) return "concerned";
  if (["worried", "fear", "nervous", "embarrassed"].includes(expression)) return "worried";
  if (["shock", "shocked", "extremeShock", "panic", "veryExcited", "sparkleExcited"].includes(expression)) return "veryRaised";
  if (["angry", "angrySqueezed", "veryAngry", "rage", "shadowRage", "disgusted"].includes(expression)) return expression === "shadowRage" ? "animeAngry" : "angry";
  if (["serious", "focused", "determined", "coldGlare", "animeDetermined"].includes(expression)) return "determined";
  if (["suspicious", "annoyed", "unimpressed"].includes(expression)) return "suspicious";
  if (["cunning", "smug"].includes(expression)) return "cunning";
  if (["curious", "confused", "awkward"].includes(expression)) return "curious";
  if (["excited", "animeCute", "sparkleCute", "pleading"].includes(expression)) return "excited";
  if (["soft", "friendly", "happy", "happyClosed", "laughClosed", "tired", "sleepy"].includes(expression)) return "soft";
  return "neutral";
}
const gazeEase = { x1: 0.2, y1: 0.8, x2: 0.25, y2: 1 }, headEase = { x1: .2, y1: .76, x2: .3, y2: 1 }, settleEase = { x1: 0.35, y1: 0, x2: 0.25, y2: 1 }, mouthEase = { x1: 0.22, y1: 0.72, x2: 0.28, y2: 1 };
function mulberry32(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; }; }
