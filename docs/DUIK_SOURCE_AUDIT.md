# Duik Source Audit

## Source

`adobe animate and illustrator saves (imp)/illustrator/algowzxd new 2024/full body rigging duik`

The folder is treated as read-only reference material. Migration outputs belong under `migration/algowzxd_2024_duik/`.

## File inventory

| Type | Count | Finding |
| --- | ---: | --- |
| AEP | 9 | One main project, five incremental autosaves, three Adobe Media Encoder temporary projects |
| TXT | 7 | Successful AE render logs |
| AEPX/AI/SVG/PSD/PNG/JSX/JSXBIN | 0 | Artwork is linked from surrounding archive folders rather than duplicated here |

### Main project

- File: `algowzxd full body duik.aep`
- Size: 4,603,306 bytes
- Modified: 2024-03-26 20:03:39
- SHA-256: `F8669CE538330929188F1C5FFF43487DCAAEC4342BF0CD51FE059D420BFFCAC6`
- Format signature: `RIFX ... Egg!svap`, confirming a binary After Effects project.

The main project was saved three seconds after autosave 49. It is the primary source; autosave 49 is the recovery fallback.

### Autosaves

Autosaves 45 through 49 increase steadily from 4,590,652 to 4,603,992 bytes between 20:01:02 and 20:03:36. They are distinct files, not duplicates.

### Media Encoder projects

The `_AME` directory contains three temporary projects named for `algowz xd character final illustratoR 1r 2`. They are render snapshots, not the migration source of truth.

## Recoverable binary evidence

Static string inspection of the main AEP found:

- 84 Duik-related strings.
- `/*== Duik: controller ==*/` markers and `duik.controllerType` metadata.
- Duik 2D slider, slider, and 2D Connector pseudo-effects.
- Controller layers such as `C < Slider >`, `C < Slider > 39`, and `C < Slider > 40` referenced by expressions.
- Artwork/source names including `algowz xd character final illustratoR 1r`, `algowzxd eyes illustrators`, `algowzxd hoodie own`, and `mouth pieces for duik`.
- Character layer names including head, mouth control, eyes control, eyebrows, left/right hand, and left/right leg.
- Puppet Pin 1/2/3 layers for both hands and both legs.
- Expression fragments using `toComp`, `fromComp`, controller effects, and evaluated slider values.

This proves the project contains Duik controllers, connectors, expressions, and puppet-pin deformation. It does not prove the exact parent graph, joint coordinates, IK chains, or controller values; those require After Effects to evaluate the project.

## Composition evidence

Render logs confirm these compositions:

- `algowz xd character final illustratoR 1r`
- `algowz xd character final illustratoR 1r 2`

The logs show successful PSD and PNG renders for face states and left/right views. Binary strings also reference `final algowzxd 4 min to 8min or down video starting animation` and `Pre-comp 1`; the exporter must enumerate the real composition tree rather than assume which one is the character comp.

## Artwork sources

The AEP references artwork elsewhere in the archive. Preferred independent sources include:

- `algowzxd char to make with ae.ai`
- `algowzxd eyes illustrators.ai`
- `algowzxd hoodie own.ai`
- `mouth pieces for duik.ai`
- Existing full-body and part SVG exports

The migration maps AE layers back to independent vector artwork. It does not rasterize the whole composition.

## Current blockers

After Effects is not installed in the current environment, so exact layers, IDs, anchors, evaluated expressions, keyframes, effects, and comp settings cannot yet be exported. The repository now includes a read-only ExtendScript bridge. Run it once in AE with the main project open, then load the resulting `raw-duik-export.json` on the Duik Rig Import page.

