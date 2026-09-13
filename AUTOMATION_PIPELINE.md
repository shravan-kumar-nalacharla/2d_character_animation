# Automation Pipeline

## Principle

Automation creates an inspectable performance plan and ordinary editable animation data. It never manipulates the renderer directly.

```text
Audio
  -> preprocessing and content hash
  -> speech regions + acoustic features
  -> timed transcript
  -> phoneme/viseme alignment (parallel)
  -> semantic analysis
  -> performance plan
  -> motion planning and conflict resolution
  -> editable animation layers
  -> deterministic preview/render
```

## Cached analysis artifacts

- `transcript.json`: sentences and word timing
- `audio-analysis.json`: speech regions, pauses, energy, pitch, tempo, emphasis candidates
- `visemes.json`: provider, language, model version, and mouth cues
- `performance.json`: director decisions, explanations, seeds, and segment plans
- `animation.json`: generated and manual tracks

The source-audio hash and provider configuration determine cache validity.

## Director passes

1. Segment sentences and pauses.
2. Detect punctuation, questions, exclamations, enumerations, negation, uncertainty, and emphasis.
3. Estimate emotion and intensity from language and acoustics.
4. Decide whether a gesture is warranted; stillness is valid.
5. Plan gaze and head accents.
6. Select poses/gesture clips with cooldowns and collision limits.
7. Add anticipation, action, overshoot, and settle timing.
8. Add seeded life motion in unoccupied channel ranges.
9. Smooth curves and enforce rig limits.

## Animation layers and priority

```text
Manual override
Gesture
Emotion
Speech motion
Idle
Secondary motion
Base pose
```

Lip sync is an independent facial channel. Manual values win by default; additive layers are weighted and clamped by property constraints.

## Phase-one rule provider

The deterministic fallback handles questions, exclamations, long pauses, negation, enumerations, common uncertainty phrases, and acoustic intensity. It logs each rule and seed. A future model-backed provider may improve the performance plan but cannot bypass validation or manipulate keyframes directly.

## Language strategy

Speech recognition, word alignment, phoneme conversion, and viseme mapping are separate adapters. English, Hindi, and Hinglish can therefore select different providers while producing the same normalized `VisemeCue` model.


## Whole-body composition

`PerformancePlanner` retains audio/transcript analysis, caching and existing tracks. `BodyPerformance` chooses semantic clips from validated optional director fields or deterministic text/emotion rules. It applies cooldown, repetition avoidance, eased anticipation/action/hold/overshoot/settle, wrist lag and hand arcs, then writes editable tracks. `orderedTracks` resolves manual/locked tracks above directed gesture, expression, speech, idle and base layers. No AI runs per frame.

Pronunciation units now account for common English spelling exceptions, Hindi/Telugu consonant/vowel marks and romanized syllables. Viseme optimization preserves closures and salient contacts, limits fast-speech density and connects continuous mouth targets without interleaved REST. Smile/tension modify the phonetic geometry. A `PhonemeAlignmentProvider` can be injected; the bundled provider is still heuristic, not acoustic forced alignment. Accent-specific and code-switched pronunciation still needs corrected timings or an alignment provider.

Use the collapsed Body performance controls to select skin/view/strength/frequency, insert clips or inspect IK. Insertions preserve existing tracks and participate in undo. `/body/rehearsal` is an isolated gesture preview; `/body/editor-qa` exercises the actual editor without writing project autosave. With the dev server running, `node scripts/body-render-smoke.mjs` exports a four-second stick walk and hoodie folded-arm performance through the existing Remotion job API.
