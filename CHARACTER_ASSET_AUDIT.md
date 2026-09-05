# Character Asset Audit

## Recommended canonical character

Use the consistent 2024 full-body Algowzxd design: black hair and headphones, red hoodie, blue trousers, and a compact full-body silhouette. Historical close-up artwork is useful as expression reference but should not be mixed directly into the production rig.

## Reusable assets

- Layered 2024 Illustrator extraction with independent hoodie/body, arms, legs, head, hair, brows, eyes, throat, and mouths.
- `AlGowzXD final character SYMBOLED.fla`, whose static character library confirms the intended body segmentation.
- `algowzxd 360heads.ai` and left/right head art as references for future head-direction variants.
- `algowzxd eyes illustrators.ai`, now separated into 12 selectable vector eye layers.
- `algowzxd mouht pieces.ai`, now cropped into all 12 production vector mouth drawings.
- Existing Duik render tests as movement and proportion references only.
- The 34 new face exports, six side-view exports, and 44 older face exports as an emotion reference library.

## Assets requiring cleanup

- Generated SVG IDs are replaced by stable `ai24-*` artwork bindings.
- Hands are visually included in forearm artwork and need independent left/right hand layers for gesture poses.
- Eye expressions and gaze drawings are separated; independent pupil deformation remains a later enhancement.
- All 12 Illustrator mouth drawings are separated and selectable; phonetic naming will be refined during audio alignment.
- Hair is separated into several fill groups but does not yet have explicit front/back or spring-chain semantics.
- Pivots and joint positions are not embedded in the artwork and must be stored in `rig.json`.

## Missing production assets

| Missing asset | Required specification |
| --- | --- |
| Left/right pupil | Separate vector group, centered in matching eyeball, same head coordinate system |
| Eyelids and blink | Top/bottom or closed-eye groups aligned to each eyeball |
| Independent eyebrows | Left/right vector groups with inner brow near face center |
| Core visemes | `Neutral`, `M`, `D`, `S`, `Ee`, `Uh`, `Aa`, `R`, `Oh`, `W_Oo`, `F`, `L` |
| Expressive mouth parameters | Smile/frown/widen controls or normalized expressive variants for each core viseme |
| Hand poses | Relaxed, open, fist, point, count one/two/three, thumbs-up, thinking |
| Hair semantics | Named `hair_back`, `hair_front`, and optional spring pieces |

All additions must match the canonical face size, line weight, color palette, origin, and viewBox. Missing artwork may use clearly marked placeholders during engine development.

## Duplicates and unusable assets

- Exact duplicates: `sad 1`/`slightly sad 3`, `laugh 3`/`slightly smile 3`, `shock 3`/`shock 4`, and `angry 4`/`angry 5`.
- `shock 5` has a mismatched 640x360 resolution and visible interface artifacts.
- AI-generated role images vary in anatomy, pose, rendering, and head design; they are not interchangeable rig layers.
- Character-variation images contain inconsistent designs and watermarks.
- Old full-character expression PNGs are flattened and cannot be combined with phoneme animation.
- Low-resolution palette PNG exports are unsuitable for the production vector rig.
- Green-screen videos are final outputs, not editable character parts.
- Third-party eye, hoodie, mouth, and hand packs require provenance/license retention and should not silently enter the canonical character.

## Current Illustrator mapping

| Rig slot | Source ID prefix |
| --- | --- |
| torso | `ai24-body`, collar, shading, waist, threads |
| upperArmR | `ai24-right-hand-shoulder` |
| forearmR | `ai24-right-hand` |
| upperArmL | `ai24-left-hand-shoulder` |
| forearmL | `ai24-left-hand` |
| thighR | `ai24-right-thigh` |
| shinR | `ai24-right-leg` |
| footR | Logical control; foot art remains inside `ai24-right-leg` |
| thighL | `ai24-left-thigh` |
| shinL | `ai24-left-leg` |
| footL | Logical control; foot art remains inside `ai24-left-leg` |
| neck | `ai24-neck` |
| head | `ai24-head-*` plus the native face overlay |
