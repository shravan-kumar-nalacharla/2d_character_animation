import type { AudioAnalysis, AudioSource, CharacterPerformanceProfile, Emotion, EyeExpression, GazeTarget, HeadInstruction, Intent, PerformancePlan, PerformanceSegment, TimedTranscript } from "../project/schema";
import { TranscriptNormalizer } from "../audio/TranscriptNormalizer";
import { LanguageDetectionEngine } from "../audio/LanguageDetectionEngine";

export interface PerformanceAIProvider {
  analyzePerformance(audio: AudioSource, transcript: TimedTranscript, acousticAnalysis: AudioAnalysis, profile: CharacterPerformanceProfile): Promise<PerformancePlan>;
}

export interface TranscriptionProvider {
  transcribe(audio: File, duration: number): Promise<TimedTranscript>;
}

export const performancePromptVersion = "v1" as const;

export class GeminiPerformanceProvider implements PerformanceAIProvider {
  async analyzePerformance(audio: AudioSource, transcript: TimedTranscript, acousticAnalysis: AudioAnalysis, profile: CharacterPerformanceProfile): Promise<PerformancePlan> {
    const response = await fetch("/api/ai/analyze-performance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audio, transcript, acousticAnalysis: compactAnalysis(acousticAnalysis), profile, promptVersion: performancePromptVersion }),
    });
    if (!response.ok) throw new Error(await apiError(response, "Gemini performance analysis failed."));
    return validatePerformancePlan(await response.json(), audio.duration, "gemini", transcript);
  }
}

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  async transcribe(audio: File, duration: number): Promise<TimedTranscript> {
    const response = await fetch("/api/ai/transcribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: audio.name, mimeType: audio.type || "audio/mpeg", duration, data: await fileBase64(audio) }),
    });
    if (!response.ok) throw new Error(await apiError(response, "Gemini transcription failed."));
    return validateTranscript(await response.json(), duration);
  }
}

export class RuleBasedPerformanceProvider implements PerformanceAIProvider {
  async analyzePerformance(audio: AudioSource, transcript: TimedTranscript, acousticAnalysis: AudioAnalysis, profile: CharacterPerformanceProfile): Promise<PerformancePlan> {
    const segments = transcript.segments.map((segment, index) => directSegment(segment, index, acousticAnalysis, profile));
    const energy = clamp(acousticAnalysis.averageRms * 4 + profile.defaultEnergy * 0.65);
    return {
      version: 1,
      provider: "rule-based",
      promptVersion: performancePromptVersion,
      overall: { language: transcript.language, mood: dominantMood(segments), energy, speakingStyle: profile.preset.toLowerCase() },
      segments,
      cache: { audioHash: audio.hash, model: "local-rules-v1", profileVersion: 1, promptVersion: performancePromptVersion, schemaVersion: 1 },
    };
  }
}

export function transcriptFromText(text: string, duration: number, language = "hinglish"): TimedTranscript {
  const sentences = text.trim().split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
  if (!sentences.length) return { version: 1, language, segments: [] };
  const totalWeight = sentences.reduce((sum, sentence) => sum + Math.max(1, sentence.length), 0);
  let cursor = 0;
  return new LanguageDetectionEngine().detect({
    version: 1,
    language,
    segments: sentences.map((sentence, segmentIndex) => {
      const span = duration * Math.max(1, sentence.length) / totalWeight;
      const start = cursor;
      const end = segmentIndex === sentences.length - 1 ? duration : cursor + span;
      cursor = end;
      const tokens = sentence.match(/[\p{L}\p{N}']+/gu) ?? [];
      const wordWeight = tokens.reduce((sum, word) => sum + word.length, 0) || 1;
      let wordCursor = start;
      const words = tokens.map((word, wordIndex) => {
        const wordSpan = (end - start) * word.length / wordWeight;
        const wordStart = wordCursor;
        const wordEnd = wordIndex === tokens.length - 1 ? end : wordCursor + wordSpan;
        wordCursor = wordEnd;
        return { id: `word-${segmentIndex + 1}-${wordIndex + 1}`, text: word, start: wordStart, end: wordEnd, source: "estimated" as const };
      });
      return { id: `sentence-${segmentIndex + 1}`, text: sentence, start, end, words };
    }),
  });
}

export function validateTranscript(value: unknown, duration: number): TimedTranscript {
  const transcript = new LanguageDetectionEngine().detect(new TranscriptNormalizer().normalize(value, duration));
  if (transcript.diagnostics?.length && import.meta.env.DEV) console.warn("Transcript timing data was normalized.", transcript.diagnostics);
  return transcript;
}

export function validatePerformancePlan(value: unknown, duration: number, provider: PerformancePlan["provider"], transcript?: TimedTranscript): PerformancePlan {
  if (!value || typeof value !== "object") throw new Error("Performance response is not an object.");
  const source = value as Record<string, unknown>;
  const overall = (source.overall ?? {}) as Record<string, unknown>;
  if (!Array.isArray(source.segments)) throw new Error("Performance segments are missing.");
  const segments = source.segments.map((raw, index) => validateSegment(raw, index, duration, transcript));
  return {
    version: 1,
    provider,
    promptVersion: performancePromptVersion,
    overall: {
      language: String(overall.language ?? "unknown"),
      mood: String(overall.mood ?? "neutral"),
      energy: clampNumber(overall.energy, 0.5),
      speakingStyle: String(overall.speakingStyle ?? "natural"),
    },
    segments,
  };
}

const emotions: Emotion[] = ["neutral", "happy", "amused", "excited", "sad", "angry", "frustrated", "surprised", "shocked", "worried", "confused", "thinking", "suspicious", "embarrassed", "proud", "disgusted", "tired"];
const intents: Intent[] = ["statement", "question", "explanation", "agreement", "disagreement", "reaction", "joke", "sarcasm", "disbelief", "warning", "complaint", "storytelling", "instruction", "thinking", "realization", "greeting", "conclusion"];
const gazes: GazeTarget[] = ["camera", "return-camera", "thinking-away", "thinking-left", "thinking-right", "reaction-left", "reaction-right", "slightly-left", "slightly-right", "up-left", "up-right", "down-left", "down-right", "left", "right", "up", "down"];
const heads: HeadInstruction[] = ["hold", "tiny_nod", "micro_nod", "normal_nod", "strong_nod", "question_tilt", "question_tilt_left", "question_tilt_right", "confused_tilt", "small_turn_left", "small_turn_right", "thinking_turn", "small_shake", "disagreement_shake", "disbelief_shake", "reaction_back", "surprise_recoil", "reaction_forward", "thinking_tilt", "emphasis_forward", "emphasis_down", "settle", "settle_to_neutral"];
const expressions: EyeExpression[] = ["neutral", "friendly", "soft", "happy", "happyClosed", "laughClosed", "sad", "verySad", "teary", "crying", "sobCrying", "concerned", "worried", "fear", "panic", "shock", "shocked", "extremeShock", "curious", "confused", "thinking", "suspicious", "cunning", "unimpressed", "bored", "tired", "sleepy", "serious", "focused", "determined", "coldGlare", "angry", "angrySqueezed", "veryAngry", "rage", "shadowRage", "disgusted", "annoyed", "embarrassed", "awkward", "nervous", "excited", "veryExcited", "sparkleExcited", "sparkleCute", "pleading", "proud", "smug", "deadpan", "animeDetermined", "animeShock", "animeCute", "winkLeft", "winkRight"];

function directSegment(segment: TimedTranscript["segments"][number], index: number, analysis: AudioAnalysis, profile: CharacterPerformanceProfile): PerformanceSegment {
  const lower = segment.text.toLowerCase();
  const isQuestion = /\?|\b(why|what|how|kya|kaise|kyun|enti|enduku|ela)\b|[ఏఎ](ంటి|మిటి)|ఎందుకు|ఎలా/.test(lower);
  const isDisagreement = /\b(no|never|nahi|mat|ledu|kaadu)\b|नहीं|मत|లేదు|కాదు/.test(lower);
  const isUncertain = /don't know|dont know|pata nahi|mujhe.*nahi pata|maybe|shayad|naku telidu|teliyadu|నాకు తెలియదు|తెలియదు/.test(lower);
  const isSurprise = /\b(wait|what|wow|insane|kya|enti|arey|ammo)\b|idi enti|ये क्या|ఇది ఏంటి|!/.test(lower);
  const isGreeting = /\b(hey|hello|hi|welcome|namaste|namaskaram)\b|नमस्ते|నమస్కారం/.test(lower);
  const isSuspicious = /\b(really|seriously|sure|sach|nijam|nijanga)\b|सच|నిజంగా/.test(lower);
  const isSad = /\b(sad|sorry|hurt|bad|dukhi|baadha)\b|दुख|బాధ/.test(lower);
  const isCrying = /\b(cry|crying|cried|sob|sobbing|tears|weeping|ro raha|rona)\b|रो रहा|रोना|ఏడుపు|ఏడుస్త/.test(lower), isRage = /\b(furious|rage|enraged|livid|boiling mad)\b|गुस्से से पागल|కోపంతో/.test(lower), isAngry = isRage || /\b(angry|mad|furious|hate|idiot|stupid|damn)\b|गुस्सा|नाराज़|కోపం|కోపంగా/.test(lower);
  const emotion: Emotion = isCrying ? "sad" : isAngry ? "angry" : isSurprise ? "surprised" : isUncertain ? "confused" : isSuspicious ? "suspicious" : isSad ? "sad" : isDisagreement ? "frustrated" : isGreeting ? "happy" : "neutral";
  const intent: Intent = isQuestion ? "question" : isDisagreement ? "disagreement" : isUncertain ? "thinking" : isSuspicious ? "disbelief" : isSurprise ? "reaction" : isGreeting ? "greeting" : "statement";
  const acoustic = peakInRange(analysis, segment.start, segment.end);
  const intensity = clamp((/[!A-Z]{2,}/.test(segment.text) ? 0.7 : 0.42) * profile.emotionStrength + acoustic * 0.35);
  const expression: EyeExpression = isRage ? "shadowRage" : isCrying ? (/\b(sob|sobbing|weeping)\b/.test(lower) || intensity > .62 ? "sobCrying" : "crying") : isAngry ? (intensity > .66 ? "veryAngry" : "angry") : isQuestion ? (index % 3 === 2 ? "concerned" : "curious") : isSuspicious ? "suspicious" : isGreeting ? "soft" : emotion === "neutral" && index % 4 === 3 ? "soft" : emotionExpression(emotion);
  const accents = segment.words.filter((word) => word.text.length > 2 && (word.text === word.text.toUpperCase() || peakNear(analysis, (word.start + word.end) / 2) > 0.62)).slice(0, 2).map((word) => ({ text: word.text, start: word.start, end: word.end, importance: clamp(0.55 + peakNear(analysis, word.start) * 0.4), type: "emphasis" }));
  const headType: HeadInstruction = isQuestion ? (index % 2 ? "question_tilt_left" : "question_tilt_right") : isDisagreement ? "disagreement_shake" : isSurprise ? "surprise_recoil" : isUncertain ? "confused_tilt" : "micro_nod";
  const accentTime = accents[0]?.start ?? segment.start + Math.min(0.22, (segment.end - segment.start) * 0.3);
  const headEvents: PerformanceSegment["headEvents"] = [];
  const semanticHead = isQuestion || isDisagreement || isSurprise || isUncertain;
  const routineBeat = segment.end - segment.start > 2.4 && index % Math.max(2, Math.round(5 - profile.performanceDensity * 3)) === 0;
  if (routineBeat && !semanticHead) headEvents.push({ type: index % 2 ? "small_turn_left" : "small_turn_right", time: segment.start + .18, duration: .72, strength: clamp(.32 + intensity * .32) });
  if (semanticHead || intensity >= .58 + (1 - profile.performanceDensity) * .2) headEvents.push({ type: headType, time: accentTime, duration: Math.min(isDisagreement ? .92 : .76, segment.end - segment.start), strength: clamp(intensity + (semanticHead ? .24 : .12)) });
  return {
    id: segment.id || `performance-${index + 1}`,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    emotion: { primary: emotion, intensity },
    intent,
    expression: { preset: expression, intensity: clamp(intensity * profile.expressionStrength), transitionIn: isSurprise ? 0.1 : 0.2, transitionOut: 0.28 },
    gaze: { target: isUncertain ? (index % 2 ? "thinking-left" : "thinking-right") : isSuspicious ? (index % 2 ? "slightly-left" : "slightly-right") : isSurprise ? "camera" : isQuestion ? (index % 2 ? "slightly-left" : "slightly-right") : "camera", intensity: clamp((isUncertain || isSurprise ? .86 : isQuestion || isSuspicious ? .72 : .28) * (.8 + profile.eyeActivity * .45)) },
    eyebrowEvents: intensity > 0.48 ? [{ type: isDisagreement ? "lower" : "raise", time: accents[0]?.start ?? segment.start + (segment.end - segment.start) * 0.4, duration: 0.32, strength: intensity }] : [],
    headEvents,
    bodyEvents: intensity > 0.68 ? [{ type: "speech-accent", time: accents[0]?.start ?? segment.start + 0.15, duration: 0.5, strength: clamp(intensity * profile.bodyMotion) }] : [],
    accents,
  };
}

function validateSegment(raw: unknown, index: number, duration: number, transcript?: TimedTranscript): PerformanceSegment {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const start = clampTime(item.start, duration);
  const end = clampTime(item.end, duration);
  if (end <= start) throw new Error(`Performance segment ${index + 1} has invalid timing.`);
  const emotion = (item.emotion ?? {}) as Record<string, unknown>;
  const expression = (item.expression ?? {}) as Record<string, unknown>;
  const gaze = (item.gaze ?? {}) as Record<string, unknown>;
  const primary = enumValue(emotion.primary, emotions, "neutral");
  return {
    id: typeof item.id === "string" ? item.id : `performance-${index + 1}`,
    start, end, text: String(item.text ?? ""),
    emotion: { primary, secondary: enumOptional(emotion.secondary, emotions), intensity: clampNumber(emotion.intensity, 0.5) },
    intent: enumValue(item.intent, intents, "statement"),
    expression: { preset: enumValue(expression.preset, expressions, emotionExpression(primary)), intensity: clampNumber(expression.intensity, 0.5), transitionIn: clampSeconds(expression.transitionIn, 0.2), transitionOut: clampSeconds(expression.transitionOut, 0.28) },
    gaze: { target: enumValue(gaze.target, gazes, "camera"), intensity: clampNumber(gaze.intensity, 0.4) },
    eyebrowEvents: validateEvents(item.eyebrowEvents, start, end, ["raise", "lower", "one-brow", "concern", "surprise", "angry"]),
    headEvents: validateEvents(item.headEvents, start, end, heads),
    bodyEvents: validateEvents(item.bodyEvents, start, end, ["hold", "lean-forward", "lean-back", "speech-accent"]),
    accents: Array.isArray(item.accents) ? item.accents.slice(0, 4).flatMap((accent) => { const entry = accent as Record<string, unknown>; const text = String(entry.text ?? ""); const aligned = findAlignedWord(transcript, text, start, end); if (!aligned) return []; return [{ text, start: aligned.start, end: aligned.end, importance: clampNumber(entry.importance, 0.5), type: String(entry.type ?? "emphasis") }]; }) : [],
  };
}

function findAlignedWord(transcript: TimedTranscript | undefined, text: string, start: number, end: number) {
  const needle = text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (!needle || !transcript) return undefined;
  return transcript.segments.flatMap((segment) => segment.words).find((word) => word.end >= start && word.start <= end && word.text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === needle);
}

function validateEvents<T extends string>(value: unknown, start: number, end: number, allowed: readonly T[]): Array<{ type: T; time: number; duration: number; strength: number }> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).flatMap((raw) => {
    const item = raw as Record<string, unknown>;
    const type = enumOptional(item.type, allowed);
    if (!type) return [];
    return [{ type, time: Math.max(start, Math.min(end, clampNumber(item.time, start))), duration: clampSeconds(item.duration, 0.3), strength: clampNumber(item.strength, 0.5) }];
  });
}

function emotionExpression(emotion: Emotion): EyeExpression {
  if (emotion === "sad") return "sad";
  if (emotion === "worried") return "concerned";
  if (emotion === "tired") return "tired";
  if (emotion === "angry" || emotion === "frustrated" || emotion === "disgusted") return "angry";
  if (emotion === "surprised" || emotion === "shocked" || emotion === "excited") return "shocked";
  if (emotion === "confused" || emotion === "thinking") return "curious";
  if (emotion === "suspicious") return "suspicious";
  return "neutral";
}

function dominantMood(segments: PerformanceSegment[]): string {
  return segments.reduce((best, segment) => segment.emotion.intensity > best.intensity ? { emotion: segment.emotion.primary, intensity: segment.emotion.intensity } : best, { emotion: "neutral", intensity: 0 }).emotion;
}

function compactAnalysis(analysis: AudioAnalysis) {
  return { duration: analysis.duration, averageRms: analysis.averageRms, speechRegions: analysis.speechRegions, pauses: analysis.pauses, emphasisPeaks: analysis.emphasisPeaks };
}

function peakInRange(analysis: AudioAnalysis, start: number, end: number) {
  return analysis.emphasisPeaks.filter((peak) => peak.time >= start && peak.time <= end).reduce((largest, peak) => Math.max(largest, peak.strength), 0);
}

function peakNear(analysis: AudioAnalysis, time: number) {
  return analysis.emphasisPeaks.filter((peak) => Math.abs(peak.time - time) < 0.25).reduce((largest, peak) => Math.max(largest, peak.strength), 0);
}

function clamp(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function clampNumber(value: unknown, fallback: number) { return clamp(typeof value === "number" ? value : fallback); }
function clampSeconds(value: unknown, fallback: number) { return Math.max(0.04, Math.min(2, typeof value === "number" ? value : fallback)); }
function clampTime(value: unknown, duration: number) { return Math.max(0, Math.min(duration, typeof value === "number" ? value : 0)); }
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T { return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback; }
function enumOptional<T extends string>(value: unknown, allowed: readonly T[]): T | undefined { return typeof value === "string" && allowed.includes(value as T) ? value as T : undefined; }
async function apiError(response: Response, fallback: string) { try { return (await response.json() as { error?: string }).error ?? fallback; } catch { return fallback; } }
async function fileBase64(file: File) { const data = await file.arrayBuffer(); let binary = ""; const bytes = new Uint8Array(data); for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000)); return btoa(binary); }
