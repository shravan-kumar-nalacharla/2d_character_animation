# Proposed Architecture

## Design goals

The editor is browser-first, deterministic, editable, and independent of Adobe animation software. SVG is the source-of-truth artwork format. Understanding dialogue, planning a performance, generating keyframes, previewing, and final rendering remain separate modules.

## Runtime boundaries

```text
React editor
  -> project/command state
  -> rig and animation engines
  -> inline SVG preview renderer

Audio analysis providers
  -> cached transcript/acoustic/viseme data
  -> performance director
  -> inspectable performance plan
  -> animation planner

Deterministic offline renderer
  -> frame sequence
  -> FFmpeg encode/mux
```

## Source layout

```text
assets/
  source_archive/
  production_character/

src/
  core/          math, IDs, command history
  rig/           bones, skeleton, constraints, controllers, IK
  animation/     keyframes, curves, tracks, clips, mixer, transport
  audio/         provider interfaces and cached analysis
  director/      rule analyzer and performance planning interfaces
  editor/        shell, viewport, hierarchy, inspector, timeline
  project/       schema, migrations, serialization
  renderer/      SVG preview and future offline renderer
```

## State ownership

- `ProjectDocument` is the serializable project model.
- React owns only transient UI state such as selection, panel state, and drag state.
- Mutations flow through commands so they can be undone.
- Animation evaluation is pure: project plus time produces a pose.
- Rendering does not mutate the rig or animation.
- Generated tracks carry provenance so subsystem regeneration can avoid manual edits.

## Preview renderer

The viewport loads the production SVG inline, identifies top-level render groups from their referenced SVG IDs, and attaches stable `data-rig-layer` names. Each artwork group keeps its original SVG transform; a generated wrapper applies the evaluated rig world matrix. This preserves artwork order while allowing skeletal parenting.

## Provider boundaries

```ts
interface LipSyncProvider {
  analyze(audio: Blob, transcript?: TimedTranscript): Promise<VisemeCue[]>;
}

interface SpeechRecognitionProvider {
  transcribe(audio: Blob, languageHint?: string): Promise<TimedTranscript>;
}

interface PerformanceAnalyzer {
  analyze(input: PerformanceInput): Promise<PerformancePlan>;
}
```

Local deterministic providers are the baseline. Cloud or local ML providers are optional adapters.

## Deferred until the foundation proves itself

- Desktop packaging
- Cloud semantic providers
- Auto-rigging arbitrary characters
- Graph editor
- Hair/clothing simulation
- Multi-character scenes
- Real-time multilingual lip sync

