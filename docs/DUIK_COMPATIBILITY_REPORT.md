# Duik Compatibility Report

## Current status

The extraction bridge, raw viewer, converter architecture, coordinate conversion, validation, and dedicated import page are implemented. Exact conversion coverage cannot be measured until `raw-duik-export.json` is produced by After Effects.

## Confirmed from static project evidence

| Feature | Status | Evidence |
| --- | --- | --- |
| Binary project recognized | Native bridge ready | Valid RIFX AEP signature |
| Duik controllers | Awaiting evaluated export | Controller markers and `duik.controllerType` strings |
| Duik sliders/connectors | Converter classification ready | Slider and 2D Connector pseudo-effects |
| Parent transforms/anchors | Exporter ready | Standard AE properties |
| Existing controller animation | Exporter ready | Generic keyframe extraction |
| Hand/leg deformation | Approximated candidate | Three Puppet Pins per limb in binary strings |
| Face selectors | Approximated candidate | Mouth/eyes controls and slider expression fragments |
| Unknown expressions | Explicitly unsupported until classified | Raw text/evaluated value retained |

## Import state definitions

- **Native:** converted to a tested native primitive.
- **Approximated:** behavior is represented but may not be mathematically identical.
- **Unsupported:** preserved for diagnosis or optional baking; never silently accepted.

## Validation gates

The import cannot be marked ready when it contains:

- Duplicate layer IDs.
- Missing parent/controller/constraint targets.
- Non-finite rest transforms.
- Parent cycles.
- Invalid composition dimensions or frame rate.
- Invalid imported constraint targets. Unsupported expressions remain visible warnings and are never counted as native coverage.

Joint delta validation becomes available after raw export. Default tolerance is 0.25 stage pixels for rest pivots and 0.1 degrees for rest rotation.

## Required next measurement

Run the exporter once in AE, load the JSON, review the selected root composition, correct artwork/controller mappings, validate, and generate the first native rig. Only then should this report state a numerical compatibility percentage.
