# Duik Extraction Specification

## Bridge contract

```text
algowzxd full body duik.aep
  -> tools/ae-duik-exporter/export-duik-rig.jsx
  -> migration/algowzxd_2024_duik/raw/raw-duik-export.json
  -> browser importer
```

The script is read-only. It may inspect the open project and write JSON chosen by the user; it never changes layers, effects, expressions, or project settings.

## Root selection

1. Use the active item when it is a composition.
2. Otherwise prefer a composition whose name contains both `algowz` and `character`.
3. Otherwise export all compositions and require root selection in the import page.

No composition name is hard-coded as authoritative.

## Export schema

The raw document contains:

- Export schema and exporter version.
- AE application/project metadata and source project path.
- Root composition ID.
- Every composition reachable from the root plus all project compositions for diagnosis.
- Composition dimensions, pixel aspect, frame rate, duration, display/work-area timing.
- Every layer's ID, index, name, comment, classification, parent ID, source metadata, switches, timing, blend mode, and 2D/3D state.
- Raw and evaluated transform values at rest time.
- Recursive effect property trees.
- Every expression-enabled property, including property path, raw expression, enabled state, and evaluated value.
- Keyframes for transforms, effects, puppet pins, and expression-controlled properties, including interpolation and temporal ease.
- Marker data where available.

## Rest time

`displayStartTime` is the default rest-sampling time. The export stores it explicitly. If a project uses an animated first frame as its rest pose, the migration page must let the user select another rest time and rerun the exporter.

## Classification

The exporter provides evidence-based hints, not final truth:

- `controller`: Duik controller comment/metadata, controller expression markers, or controller pseudo-effects.
- `structure`: Duik bone/structure metadata or structure-like naming plus rig effects.
- `null`: AE null layer.
- `artwork`: file/precomp/shape content without stronger rig evidence.
- `helper`: puppet pins, locators, IK/FK helpers, or constraint-like expressions.
- `other`: unclassified.

The native importer may refine this classification but preserves all original evidence.

## Keyframe fidelity

Keyframes retain time, value, interpolation types, temporal ease, temporal continuity, auto-Bezier state, roving state, and spatial tangents where supported. Unsupported shapes remain in the raw export and can be baked later.

## Running the exporter

1. Open `algowzxd full body duik.aep` in After Effects.
2. Select the main character composition if known.
3. Run `File > Scripts > Run Script File...`.
4. Choose `tools/ae-duik-exporter/export-duik-rig.jsx`.
5. Save as `migration/algowzxd_2024_duik/raw/raw-duik-export.json`.
6. Load that JSON on `/character/duik-import`.

Command-line execution can be added after desktop packaging. The browser never launches AE.

