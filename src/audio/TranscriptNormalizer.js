export const transcriptTiming = { overlapTolerance: 0.05, durationTolerance: 0.05, estimatedWordDuration: 0.16, minimumWordDuration: 0.02 };
export class TranscriptNormalizationError extends Error {
    diagnostics;
    constructor(message, diagnostics) {
        super(message);
        this.diagnostics = diagnostics;
        this.name = "TranscriptNormalizationError";
    }
}
export class TranscriptNormalizer {
    normalize(value, duration) {
        if (!value || typeof value !== "object" || !Number.isFinite(duration) || duration <= 0)
            throw new TranscriptNormalizationError("The transcription response was unusable.", []);
        const source = value;
        const rawSegments = Array.isArray(source.segments) ? source.segments : [];
        const diagnostics = [];
        const segments = rawSegments.flatMap((raw, segmentIndex) => this.segment(raw, segmentIndex, duration, diagnostics));
        if (!segments.length)
            throw new TranscriptNormalizationError("We couldn't create reliable speech timing for this audio.", diagnostics);
        return { version: 1, language: typeof source.language === "string" ? source.language : "unknown", segments, diagnostics };
    }
    segment(raw, segmentIndex, duration, diagnostics) {
        if (!raw || typeof raw !== "object") {
            diagnostics.push({ level: "discard", segmentIndex, reason: "Segment was null or not an object.", raw });
            return [];
        }
        const item = raw;
        const text = String(item.text ?? item.transcript ?? "").trim();
        let start = parseTimestamp(item.start ?? item.startTime ?? item.start_offset);
        let end = parseTimestamp(item.end ?? item.endTime ?? item.end_offset);
        start = start === null ? null : clamp(start, 0, duration);
        end = end === null ? null : clamp(end, 0, duration);
        const rawWords = Array.isArray(item.words) ? item.words : [];
        const parsedWords = rawWords.flatMap((word, wordIndex) => this.word(word, segmentIndex, wordIndex, duration, diagnostics));
        parsedWords.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
        const segmentStart = start ?? parsedWords.find((word) => word.start !== null)?.start ?? 0;
        const segmentEnd = end && end > segmentStart ? end : parsedWords.reduce((latest, word) => Math.max(latest, word.end ?? 0), segmentStart);
        let words = repairWords(parsedWords, segmentStart, segmentEnd > segmentStart ? segmentEnd : Math.min(duration, segmentStart + Math.max(0.2, text.length * 0.05)), duration, segmentIndex, diagnostics);
        if (!words.length && text)
            words = estimateWords(text, segmentStart, segmentEnd > segmentStart ? segmentEnd : duration, segmentIndex);
        if (!words.length) {
            diagnostics.push({ level: "discard", segmentIndex, reason: "Segment contained no spoken words.", raw: safeRaw(raw) });
            return [];
        }
        const finalStart = Math.max(0, Math.min(start ?? words[0].start, words[0].start));
        const finalEnd = Math.min(duration, Math.max(end ?? words.at(-1).end, words.at(-1).end));
        if (finalEnd <= finalStart) {
            diagnostics.push({ level: "discard", segmentIndex, reason: "Segment had no positive duration after repair.", raw: safeRaw(raw) });
            return [];
        }
        return [{ id: typeof item.id === "string" ? item.id : `sentence-${segmentIndex + 1}`, text: text || words.map((word) => word.text).join(" "), start: finalStart, end: finalEnd, words: words.map(finalizeWord) }];
    }
    word(raw, segmentIndex, wordIndex, duration, diagnostics) {
        if (!raw || typeof raw !== "object") {
            diagnostics.push({ level: "discard", segmentIndex, wordIndex, reason: "Word was null or not an object.", raw });
            return [];
        }
        const item = raw;
        const text = typeof item.text === "string" ? item.text.trim() : typeof item.word === "string" ? item.word.trim() : "";
        if (!text) {
            diagnostics.push({ level: "discard", segmentIndex, wordIndex, reason: "Word text was empty.", raw: safeRaw(raw) });
            return [];
        }
        if (/^[\p{P}\p{S}]+$/u.test(text)) {
            diagnostics.push({ level: "discard", segmentIndex, wordIndex, reason: "Punctuation-only token is not a spoken word.", raw: safeRaw(raw) });
            return [];
        }
        let start = parseTimestamp(item.start ?? item.startTime ?? item.start_offset);
        let end = parseTimestamp(item.end ?? item.endTime ?? item.end_offset);
        if (start !== null && (start < 0 || start > duration)) {
            diagnostics.push({ level: start > duration ? "discard" : "repair", segmentIndex, wordIndex, reason: `Start ${start} was outside the audio duration.`, raw: safeRaw(raw) });
            if (start > duration)
                return [];
            start = 0;
        }
        if (end !== null && end > duration) {
            diagnostics.push({ level: "repair", segmentIndex, wordIndex, reason: `End ${end} was clamped to ${duration}.`, raw: safeRaw(raw) });
            end = duration;
        }
        return [{ id: typeof item.id === "string" ? item.id : `word-${segmentIndex + 1}-${wordIndex + 1}`, text, start, end, confidence: finiteConfidence(item.confidence), source: item.source === "alignment" || item.source === "estimated" ? item.source : "transcription", originalIndex: wordIndex }];
    }
}
export function parseTimestamp(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim().toLowerCase().replace(/s$/, "");
    if (!trimmed)
        return null;
    const parts = trimmed.split(":");
    if (parts.length > 3 || parts.some((part) => part === "" || !Number.isFinite(Number(part))))
        return null;
    const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);
    return Number.isFinite(seconds) ? seconds : null;
}
export function transcriptInputFromInteraction(raw, duration) {
    const interaction = raw;
    const annotations = (interaction.steps ?? []).flatMap((step) => (step.content ?? []).flatMap((content) => content.annotations ?? [])).filter((item) => item.type === "word_info");
    if (!annotations.length)
        throw new Error("Native transcription returned no word timestamps.");
    const words = annotations.map((word) => ({ text: word.text, start_offset: word.start_offset, end_offset: word.end_offset, confidence: word.confidence }));
    return { language: "auto", provider: "gemini-3.5-transcribe", segments: [{ id: "sentence-1", text: interaction.output_text ?? words.map((word) => word.text).join(" "), start: 0, end: duration, words }] };
}
function repairWords(words, segmentStart, segmentEnd, duration, segmentIndex, diagnostics) {
    const result = [];
    for (let index = 0; index < words.length; index++) {
        const word = { ...words[index] };
        const previous = result.at(-1);
        const nextStart = words.slice(index + 1).find((candidate) => candidate.start !== null)?.start ?? null;
        let wordStart = word.start;
        let wordEnd = word.end;
        if (wordStart === null) {
            wordStart = previous?.end ?? segmentStart;
            word.source = "estimated";
            diagnostics.push({ level: "repair", segmentIndex, wordIndex: word.originalIndex, reason: `Missing start estimated as ${wordStart}.` });
        }
        if (wordEnd === null) {
            wordEnd = nextStart !== null && nextStart > wordStart ? nextStart : Math.min(segmentEnd, wordStart + transcriptTiming.estimatedWordDuration);
            word.source = "estimated";
            diagnostics.push({ level: "repair", segmentIndex, wordIndex: word.originalIndex, reason: `Missing end estimated as ${wordEnd}.` });
        }
        if (previous && wordStart < previous.end && previous.end - wordStart <= transcriptTiming.overlapTolerance) {
            diagnostics.push({ level: "repair", segmentIndex, wordIndex: word.originalIndex, reason: `Tiny overlap of ${previous.end - wordStart}s was removed.` });
            wordStart = previous.end;
        }
        if (wordEnd <= wordStart) {
            const repairedEnd = Math.min(duration, Math.max(wordStart + transcriptTiming.minimumWordDuration, nextStart ?? wordStart + transcriptTiming.estimatedWordDuration));
            if (repairedEnd <= wordStart) {
                diagnostics.push({ level: "discard", segmentIndex, wordIndex: word.originalIndex, reason: "Word had no positive duration after repair." });
                continue;
            }
            wordEnd = repairedEnd;
            word.source = "estimated";
            diagnostics.push({ level: "repair", segmentIndex, wordIndex: word.originalIndex, reason: `Non-positive duration repaired to ${wordStart}–${wordEnd}.` });
        }
        if (![wordStart, wordEnd].every(Number.isFinite) || wordStart < 0 || wordEnd > duration + transcriptTiming.durationTolerance) {
            diagnostics.push({ level: "discard", segmentIndex, wordIndex: word.originalIndex, reason: "Word remained outside strict timing limits after normalization." });
            continue;
        }
        result.push({ ...word, start: clamp(wordStart, 0, duration), end: clamp(wordEnd, 0, duration) });
    }
    return result;
}
function estimateWords(text, start, end, segmentIndex) {
    const tokens = text.match(/[\p{L}\p{N}']+/gu) ?? [];
    const span = Math.max(0.02, (end - start) / Math.max(1, tokens.length));
    return tokens.map((token, index) => ({ id: `word-${segmentIndex + 1}-${index + 1}`, text: token, start: start + span * index, end: index === tokens.length - 1 ? end : start + span * (index + 1), source: "estimated", originalIndex: index }));
}
function finalizeWord({ originalIndex: _ignored, ...word }) { return word; }
function finiteConfidence(value) { return typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 1) : undefined; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeRaw(value) { try {
    return JSON.parse(JSON.stringify(value));
}
catch {
    return "[unserializable]";
} }
