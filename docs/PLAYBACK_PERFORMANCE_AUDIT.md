# Playback Performance Audit

## Original architecture

- Playback used `requestAnimationFrame`, but called React `setCurrentTime()` every display refresh.
- Because the time state lived in `App`, the entire editor tree was reconciled every frame: hierarchy, viewport, inspector, timeline, AI panel, and footer.
- Audio playback used `audio.currentTime` directly; silent playback accumulated per-frame deltas.
- Track evaluation used a linear `findIndex` scan for every animated property on every render.
- Known mouth and eye SVGs were referenced on demand and were not explicitly decoded before playback.
- The default project was 30 FPS even though animation key times were already stored correctly in seconds.
- Continuous channels were interpolated, but the evaluator did unnecessary repeated searches.

## Changes

- Default and migrated Algowzxd projects use 60 FPS. Keyframe times remain floating-point seconds.
- `MasterPlaybackClock` derives time from `performance.now()` and gently reconciles against dialogue audio every 200 ms. Errors over 120 ms snap; smaller drift is corrected gradually.
- `PlaybackViewport` owns the high-frequency render time. The parent editor/playhead UI receives a throttled update at no more than 20 Hz.
- The character remains sampled on every browser `requestAnimationFrame`; frame advancement is never `time += 1 / fps`.
- Track lookup uses a forward segment cursor during playback and binary search for seeks/scrubbing.
- `FaceAssetCache` decodes all known viseme, eye, eyebrow, highlight, blink, and override assets before playback begins.
- Auto preview quality only disables nonessential bone/control overlays after sustained low preview FPS; character timing remains full quality.
- Continuous generated tracks pass through velocity checks. Discrete viseme and expression IDs remain untouched.

## Measured preview result

Measured in the local Codex browser at 1920×1080 after a 2.5-second playback sample on August 30, 2026:

| Metric | Result |
|---|---:|
| Project FPS | 60 |
| Actual preview FPS | 60.1 |
| Average frame time | 16.7 ms |
| Worst frame time | 17.0 ms |
| Dropped preview frames | 0 |
| Animation evaluation | < 0.01 ms for the empty/default track set |
| Rig solve | < 0.01 ms for the default static pose |
| SVG/React viewport update | 2.20 ms |
| Viewport React renders | approximately 60/sec while playing |
| Timeline/editor updates | capped at 20/sec |
| Audio synchronization error | 0.0 ms in the no-audio sample |

The **Show Performance** overlay measures the currently loaded dialogue project, including audio drift, so active-production figures can be collected without developer tools.

## Export architecture

Export is not a screen recording. `OfflineAnimationRenderer` samples exact timestamps using `time = frameIndex / fps`, renders the existing SVG/evaluator result at the selected output resolution, uploads deterministic PNG frames into `.temp/render-{id}/frames`, and asks the local export bridge to encode them with FFmpeg.

- MP4: H.264, `yuv420p`, explicit output FPS, optional 48 kHz AAC audio.
- WebM: VP9, optional alpha, optional Opus audio.
- PNG sequence: transparent-capable PNG frames packaged as a ZIP.
- Frame count: `Math.ceil(duration * fps)`.
- Failed and canceled jobs terminate FFmpeg and remove their temporary directory.
- Successful jobs remove frames unless **Keep render frames** is enabled.

## Verification

- FFmpeg 8.0.1 detected and ready.
- One-frame deterministic 1920×1080, 60 FPS H.264 smoke export encoded and downloaded successfully.
- Unit suite covers continuous interpolation, multilingual planning, motion limiting, and discrete-channel preservation.
