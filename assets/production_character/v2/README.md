# Algowzxd Production Character V2

This folder is the normalized, versioned asset pack for the automated cutout rig. The existing `illustrator2024` character remains the default and is not overwritten.

## Included in revision 1

- 30 expression presets with six independent 512×512 RGBA PNG layers each: left eye, right eye, left eyebrow, right eyebrow, silent/reaction mouth, and optional face shading.
- 16 separate SVG hand poses for each side with a shared wrist anchor.
- One oversized SVG sneaker for each side with an ankle anchor.
- Existing left/right thigh and shin vectors copied into versioned leg slots.
- Reusable elbow, knee, wrist, and ankle overlap caps.
- `manifest.json` implementing Asset Contract V2, including dimensions, pivots, visible bounds, handedness, tags, hashes for raster assets, and view availability.

All character sides are anatomical (`left` means the character's left). Facial hair is forbidden by the manifest design rules. Brows are black; pupils use a black/charcoal palette.

## Runtime behavior

Choose **Modular Expressions V2** in the Face Asset Manager. Eyes, eyebrows, and shading come from the mapped expression preset. The preset mouth is used only for `REST`; the existing 15-viseme mouth system remains active during speech.

Open `/assets/v2-qa` to inspect expression composites, individual hands, shoes, leg segments, bounds, and anchors on a checker background.

## Validation and regeneration

```bash
pnpm assets:validate
node tools/sync-character-assets-v2.mjs --expression-source /absolute/path/to/teen-2d-expression-mega-pack
```

The validator checks the manifest links, files, PNG decoding, true alpha, non-empty required artwork, exact dimensions, SHA-256 hashes, SVG view boxes, and duplicate content. A fully transparent shading layer is allowed because shading is optional.

## Known migration boundary

Revision 1 deliberately preserves the proven front-view Illustrator thigh/shin artwork. Independent shoes can overlay the legacy lower-leg art now, but final ankle cleanup and binding the new hands/shoes to solved IK effectors belongs to the rig/IK phase. Non-front view packs remain marked unavailable rather than being faked by rotating front-view pieces.
