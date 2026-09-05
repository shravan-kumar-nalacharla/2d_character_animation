# Algowzxd Cry System V1

## Diagnosis

The cute-eye source board contains complete eyes. `Split-FaceBoard()` divided that board at `height / 2` before alpha cropping, while both eyes extend below the midpoint. The builder therefore discarded the lower curves; the runtime PNGs confirmed the failure with a `0 px` bottom alpha margin. Neither the viewport CSS, SVG overflow, an AE mask, nor a precomp caused this crop.

`tools/fix-cry-assets.ps1` now extracts the complete upper-board components and rebuilds the cute and watery eye pairs with equal transparent padding. The current cute assets have `67 px` clear space on every side (13.6% of the normalized canvas). Semantic placement remains at `LEFT_EYE_ANCHOR = [858,176]` and `RIGHT_EYE_ANCHOR = [930,176]`; asset metadata records normalized anchor, pupil center, baseline, and safe margin.

## Runtime layer structure

```text
ALGOWZXD_HEAD
  FACE_BASE
  CRY_SYSTEM
    LEFT_TEAR_BOUNDARY (static)
      repeating water texture (animated Y offset)
      SVG fractal-noise displacement
    RIGHT_TEAR_BOUNDARY (static)
      repeating water texture (animated Y offset)
      SVG fractal-noise displacement
    FACE_INTERIOR_MATTE (final outer clip)
  CRY_EYES_NULL (eye + brow tremble only)
  MOUTH
  HAIR
```

The final face clip is outside the displaced water groups. Therefore displaced tear alpha is intersected with the face interior after deformation. Normal streams cannot render over the outline, neck, shirt, or background.

## Geometry and controls

- Tear origins: left `[858,195]`, right `[930,195]`, tapered at the lower-eyelid baseline.
- Both paths bend inward from the cheeks and terminate around `y=253` at the bottom-chin region, clipped by the inset face matte rather than an exposed rectangular Y crop.
- Master loop: `2.0 s`; tile height `48 px`; default flow speed `24 px/s`.
- Turbulence: amount `2.2 px`, size `24 px`, one octave, seed `7`; primarily horizontal (`baseFrequency X = 0.55 / size`, `Y = 1.8 / size`).
- Cry shake: `12 Hz`, `1.6 px` horizontal, `0.55` vertical ratio, `0.18°` maximum rotation.
- Tear opacity `0.92`; tear amount `1.0`.
- States: `off`, `watery`, `aboutToCry`, `firstTear`, `cryStream`, `cryingHard`, `waterfallExtreme`.

The web/Remotion implementation uses deterministic equivalents of these AE expressions:

```jsx
// Water texture Y offset (48 px tile, 2-second loop)
speed = effect("CRY_CONTROLS")("Tear Flow Speed");
(time * speed) % 48;

// CRY_EYES_NULL position
freq = effect("CRY_CONTROLS")("Cry Shake Frequency");
ampX = effect("CRY_CONTROLS")("Cry Shake Amount");
ampY = ampX * effect("CRY_CONTROLS")("Cry Shake Vertical Ratio");
phase = time * Math.PI * 2 * freq;
value + [Math.sin(phase) * ampX, Math.sin(phase + 1.7) * ampY];

// CRY_EYES_NULL rotation
Math.sin(time * Math.PI * 2 * freq + 0.8) * effect("CRY_CONTROLS")("Cry Shake Rotation");
```

For an After Effects port, use `Turbulent Displace` on the water layer only: Horizontal Displacement, Amount `2.2`, Size `24`, Complexity `1`, Evolution `0x` to `2x` over `2.0 s`, Cycle Evolution enabled. Apply the tear silhouette and then `FACE_INTERIOR_MATTE` after the effect.

## QA

- `assets/production_character/raster_face_v1/qa/cute_eye_padding_check.png`: contrasting-background alpha-margin test.
- `assets/production_character/raster_face_v1/qa/cry_system_qa.png`: six-panel rendered QA surface.
- `assets/production_character/raster_face_v1/qa/cry_system_phase_a.png` and `cry_system_phase_b.png`: different deterministic flow/tremble phases.
- `assets/production_character/raster_face_v1/qa/angry_manual_tear_regression.png`: direct regression for the supplied angry-eye/manual-stream failure case.
- `/face/cry-qa`: live 5-second pre-cry, transition, 10-second stream, matte-debug, and head-motion previews.
- Automated tests: loop equality at `0` and `2 s`, alpha-containment detector, and runtime markup verification that both tear boundaries are descendants of the final face matte.

Current result: `43/43` tests pass, production build passes, browser console has no errors, and the two captured phases confirm both water translation and eye tremble change over time. No `.aep` binary was modified; the AE values above are the exact porting handoff for the deterministic system implemented and tested in the app.
