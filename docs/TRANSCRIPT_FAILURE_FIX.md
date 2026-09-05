# Transcript word failure — root cause and repair

## Located failure

The old `validateTranscript` implementation in `src/director/PerformanceProviders.ts` converted every timestamp with `clampTime`. Unsupported values such as `"1.42s"`, `"00:01.420"`, `undefined`, `NaN`, and `Infinity` became `0`. It then used one combined failure condition:

```ts
typeof entry.text !== "string" || wordEnd <= wordStart
```

That condition produced `Transcript word 23 is invalid.` and discarded the entire transcription. It did not retain the raw token or distinguish invalid text from an unparsed, missing, or zero-length timestamp. Consequently, the historical raw word 23 cannot be reconstructed from the project/autosave; the response was never persisted. The open editor also no longer contains the user-selected audio `File`, so reproducing that exact raw token requires one retry.

## New behavior

`TranscriptNormalizer` now accepts numeric seconds, numeric strings, suffixed seconds, `MM:SS.mmm`, and `HH:MM:SS.mmm`. It removes null/punctuation tokens, sorts words, estimates missing boundaries, repairs non-positive durations and overlaps up to 50ms, clamps duration overshoot, and then applies strict finite-domain validation.

Every repair/discard records its segment index, original word index, reason, and safe raw object. Accepted corrections appear under **Transcript → View details**. Unrecoverable responses show a normal user message plus a separate developer-details disclosure. No API keys are included.

## Test coverage

Regression tests cover missing end times, string timestamps, punctuation-only tokens, null words, wrong order, tiny overlaps, non-finite values, and audio-duration overshoot.
