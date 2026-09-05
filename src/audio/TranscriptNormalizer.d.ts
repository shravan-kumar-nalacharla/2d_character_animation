import type { TimedTranscript } from "../project/schema";
export declare const transcriptTiming: {
    readonly overlapTolerance: 0.05;
    readonly durationTolerance: 0.05;
    readonly estimatedWordDuration: 0.16;
    readonly minimumWordDuration: 0.02;
};
export interface TranscriptDiagnostic {
    level: "repair" | "discard";
    segmentIndex: number;
    wordIndex?: number;
    reason: string;
    raw?: unknown;
}
export declare class TranscriptNormalizationError extends Error {
    readonly diagnostics: TranscriptDiagnostic[];
    constructor(message: string, diagnostics: TranscriptDiagnostic[]);
}
export declare class TranscriptNormalizer {
    normalize(value: unknown, duration: number): TimedTranscript;
    private segment;
    private word;
}
export declare function parseTimestamp(value: unknown): number | null;
export declare function transcriptInputFromInteraction(raw: unknown, duration: number): {
    language: string;
    provider: string;
    segments: {
        id: string;
        text: string;
        start: number;
        end: number;
        words: {
            text: unknown;
            start_offset: unknown;
            end_offset: unknown;
            confidence: unknown;
        }[];
    }[];
};
