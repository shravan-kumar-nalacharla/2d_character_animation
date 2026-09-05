# Algowzxd Animator

Browser-first 2D rigging and animation software for the Algowzxd character. The application does not depend on After Effects, Duik, or Character Animator.

## Run locally

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4173/`.

## Verify

```powershell
pnpm test
pnpm build
```

## Audio → automatic performance

1. Click **Import Audio** and choose a browser-supported audio file.
2. In **AI Performance**, paste an optional transcript. A transcript is required for the offline rule-based provider.
3. Choose a preset and the subsystems to generate, then click **AUTO ANIMATE WITH AI**.
4. Generated expression, gaze, eyebrow, head, body, blink, and mouth keys appear on the timeline.
5. Click a keyframe to edit its time, value, interpolation, or delete it. Individual subsystems can be regenerated without replacing unrelated tracks.

Playback and scrubbing use audio as the master clock. Waveform, timed words, semantic segments, and animation channels share one timeline. Local acoustic analysis and rule-based performance work without cloud AI.

### Enable Gemini

Copy `.env.example` to `.env.local`, set the values below, and restart `pnpm dev`:

```text
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TRANSCRIPTION_MODEL=gemini-3.5-transcribe
```

The key is read only by the local server and is never included in browser JavaScript or project files. Gemini failure offers local rule-based and lip-sync-only fallbacks.

Alternatively, open **AI Performance**, paste a key into the masked Gemini field, and click **Connect**. Browser-entered keys remain only in local server memory and disappear when the development server restarts.

The current lip sync is a deterministic transcript/viseme aligner with English, Hindi, and Hinglish grapheme mapping. Its provider interface can accept a higher-precision forced aligner later without changing the editor.

Gemini 3.5 Transcribe supplies native word timestamps when available. Gemini 2.5 Flash remains the semantic performance model. Malformed individual annotations pass through `TranscriptNormalizer`; recoverable timing problems no longer cancel the complete animation.

## Editor controls

- Select artwork by clicking the character or hierarchy.
- Edit transforms, pivots, limits, and parenting in the Inspector.
- Drag visible bone/controller handles in the viewport.
- Use the mouse wheel to zoom and middle-drag to pan.
- Toggle bones and controllers in the toolbar.
- Undo/redo with toolbar buttons or `Ctrl+Z` / `Ctrl+Y`.
- Save a versioned project JSON or load one with Open.
- Press Space or use the transport controls for playback.

Use the AI Performance panel for performance presets, channel strengths, selective generation, and an inspectable semantic plan.

## Documentation

- `CURRENT_PROJECT_AUDIT.md`
- `CHARACTER_ASSET_AUDIT.md`
- `PROPOSED_ARCHITECTURE.md`
- `RIG_SCHEMA.md`
- `AUTOMATION_PIPELINE.md`
- `IMPLEMENTATION_ROADMAP.md`
- `docs/AI_AUDIO_ANIMATION_AUDIT.md`

# 2d_character_animation
