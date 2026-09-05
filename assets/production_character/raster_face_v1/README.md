# Algowzxd generated raster face pack V1

The runtime assets in this folder are transparent PNG layers generated with the canonical Algowzxd artwork as the identity/style reference and the supplied expression crops as expression-language references.

## Runtime structure

- `eyes/`: seven left/right eye pairs
- `eyebrows/`: seven matching left/right brow pairs
- `tears/`: independent left/right generated waterfall streams
- `face_fx/`: generated rage shadow, two anger crosses, and one anger-vein mark
- `source_boards/`: accepted original generation boards retained for audit/reprocessing

The generated artwork is never regenerated as a whole character. `tools/build-raster-face-pack.ps1` crops and normalizes accepted boards without drawing replacement art.

## Rejected generations

- Narrow glare V1: rejected because the apparent transparency was a baked checkerboard.
- Annoyed V1: rejected because the apparent transparency was a baked checkerboard.
- Shadow rage V1: rejected because it resembled a hair/head silhouette and baked its checkerboard.
- Shadow rage V2: rejected because it included a complete head outline instead of a face-only veil.
- Cute sparkle board brows: rejected because one/both requested brows were omitted; a dedicated brow generation replaced them.

## Remaining improvements

- Split pupils and eye highlights from the generated sclera for full independent gaze animation.
- Generate a second seamless tear texture phase if a longer, non-looping waterfall shot is required.
- Add generated emotional mouth layers after this eye/FX batch is approved.
