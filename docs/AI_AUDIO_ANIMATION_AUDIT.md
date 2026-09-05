# AI Audio Animation Audit

## Current state

The repository is a browser-first React/TypeScript/Vite editor. It has no After Effects runtime dependency and no server process beyond Vite development serving.

| Area | Existing implementation | Gap for this phase |
|---|---|---|
| Character viewport | Layered Illustrator-derived SVG loaded by `Viewport.tsx`; artwork is bound to native bones | Generated animation values are not evaluated at the playhead |
| Rig/controllers | Parent-child bone transforms, draggable controllers, pivots, constraints, undo/redo | No animation mixer, IK playback, or controller keyframe evaluation |
| Face | 12 mouth assets, 12 eye presets, separate eyes/brows/highlights, gaze/blink values, per-mouth transforms | Current playback is a fixed procedural demo rather than timeline data |
| Timeline | Transport, playhead, scrubber, second ruler, two placeholder tracks | No audio, waveform, clips, typed properties, easing, editing, or generated/manual separation |
| Keyframes | `AnimationTrack` stores numeric time/value with `linear` or `hold` | Cannot represent visemes, expressions, Bezier easing, source metadata, or channel targets |
| Playback | `requestAnimationFrame` advances `currentTime` | No audio clock synchronization; browser frame time is the only clock |
| Project format | Versioned JSON with rig, face, stage, and animation arrays; autosave and file save/load | No audio metadata, transcript, acoustic analysis, performance plan, cache metadata, or migration beyond character revision |
| Audio | None | Import, decoding, waveform, analysis, synchronized playback, and source lifecycle are required |
| AI/backend | None | No secret-safe backend, Gemini provider, validation, caching, status, or fallback provider |
| Tests | Matrix hierarchy, command history, project, Duik import, deterministic face preview | Audio analysis, plan validation, rule decisions, keyframe generation, interpolation, and migration need coverage |

## Reusable systems

- Keep `App.tsx` as the project/session coordinator and extend it with audio session state.
- Keep `ProjectDocument` as the serialized root, but add separate `audio`, `transcript`, `analysis`, `performance`, and typed `animation` sections.
- Keep `currentTime` as the master editor time while using the imported audio element as the clock during audio playback.
- Keep `FaceRig` as the renderer; replace its demo-only values with evaluated timeline state when generated tracks exist.
- Keep existing bone matrices, controller manipulation, undo/redo, save/load, and Illustrator artwork untouched.
- Reuse the existing timeline layout and make its lanes data-driven.

## Required architecture

```text
Audio file -> browser decode -> waveform + deterministic acoustic analysis
          -> transcription/alignment provider -> timed transcript + visemes
          -> PerformanceAIProvider -> validated PerformancePlan
          -> deterministic planners -> editable typed tracks
          -> playhead evaluator -> existing FaceRig/native bones
```

Gemini is restricted to transcription and semantic direction. It cannot emit rig transforms or final keyframes. Browser code calls only a local `/api/ai/*` boundary; `GEMINI_API_KEY` remains server-side. A deterministic `RuleBasedPerformanceProvider` remains available without configuration or network access.

## MVP decisions

1. Add WAV/MP3 import, Web Audio decoding, waveform peaks, RMS envelope, silence/speech regions, and audio-clock playback.
2. Store only audio metadata/hash in project JSON; browser object URLs are session-only and never masquerade as portable file paths.
3. Add strict internal validators without a new validation dependency.
4. Add a secure Vite local API for Gemini structured output and configuration status.
5. Generate editable tracks for mouth, expression, gaze, blink, eyebrows, head, and body using deterministic planners.
6. Provide transcript text fallback and a rule-based director so Auto Animate works before a Gemini key or forced aligner is installed.

## Known limitations after the first working slice

- Browser sessions cannot restore a local audio file after reopening a project; the UI must request relinking by name/hash.
- The first local viseme fallback uses transcript timing and language-aware character heuristics, not forced acoustic phoneme alignment. The provider boundary will allow Rhubarb or another tested aligner later.
- Production deployment needs a dedicated backend rather than relying on the Vite development middleware.
- Full drag/resize editing and a graph editor remain later timeline work; generated events are ordinary serialized track data from the first slice.
