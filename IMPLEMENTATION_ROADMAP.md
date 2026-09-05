# Implementation Roadmap

## Phase 1 - Foundation

Deliver a runnable editor shell with inline SVG loading, selectable artwork, hierarchy, skeletal parenting, pivots, transform controllers, undo/redo, project save/load, and deterministic transport state.

Acceptance checks:

- Selecting a body part in the hierarchy or viewport selects the same bone.
- Editing translation/rotation/scale visibly updates the character.
- Moving a parent moves its children through world transform propagation.
- Controllers and bone/pivot overlays can be shown or hidden.
- Undo and redo restore transforms.
- Saving and loading round-trips the project.
- Playback time is deterministic and scrubbable.

## Phase 2 - Body rig

Add robust two-bone IK, pole controls, limits, IK/FK mixing, pose-preserving switching, and separate hand artwork. Validate arms and legs against impossible bends and body intersections.

## Phase 3 - Face

Normalize eye, brow, lid, pupil, and mouth assets. Add gaze, blink, expression parameters, expression presets, and composable viseme/emotion evaluation.

## Phase 4 - Timeline

Add editable tracks, keyframes, interpolation, audio waveform, selections, clipboard operations, clip instances, and generated/manual provenance.

## Phase 5 - Audio and lip sync

Implement audio import, caching, transcription adapters, English/Hindi/Hinglish viseme adapters, mouth-track editing, and synchronization tests.

## Phase 6 - Life motion

Add seeded blink, breathing, micro-gaze, posture drift, and speech-correlated head motion. Life motion must yield to intentional and manual animation.

## Phase 7 - Semantic director

Implement the deterministic performance analyzer, inspectable plans, emotion/gaze/gesture planners, decision logging, and the six specified sentence fixtures.

## Phase 8 - Full-body automation

Create reusable gestures and hand poses, semantic scheduling, anticipation/follow-through, collision avoidance, layered mixing, and non-destructive subsystem regeneration.

## Phase 9 - Production polish

Add curve editing, clip browser, performance presets, secondary motion, deterministic offline SVG frame rendering, FFmpeg export, autosave/recovery, accessibility, and desktop packaging evaluation.

## Delivery rule

Each phase must leave the application runnable, add the smallest meaningful automated check, and use the real Algowzxd character as soon as the subsystem supports it.

