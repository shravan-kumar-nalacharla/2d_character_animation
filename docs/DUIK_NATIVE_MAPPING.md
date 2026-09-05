# Duik to Native Mapping

## Preservation rule

Preserve behavior, rest pose, pivots, controller placement, bend preference, and useful ranges. Do not interpret or execute AE expressions in the browser.

| Source evidence | Native result | Initial state |
| --- | --- | --- |
| AE parent property | Bone/controller parent ID | Native |
| Anchor, position, rotation, scale | Rest transform and source anchor | Native |
| Duik controller marker/pseudo-effect | Native controller | Native |
| Controller transform keyframes | Reference animation track | Native where values are supported |
| Known two-bone IK effects/expressions | `TwoBoneIKConstraint` | Native after chain validation |
| Known IK/FK slider | `IKFKBlendConstraint` | Native after target/FK mapping |
| Position/orientation/parent constraint | Native constraint primitive | Native or approximated by evidence |
| Puppet Pin 1/2/3 chain | Bone chain plus artwork deformation binding | Approximated until vector skinning exists |
| Connector/sliders for face switching | Native parameter/selector channel | Approximated |
| Unknown expression | Raw diagnostic plus optional baked samples | Unsupported until classified |

## Coordinate conversion

AE and SVG both use positive X right and positive Y down. Layer position is in parent/comp coordinates; anchor is in source coordinates. The importer preserves both and uses:

```text
source point
  -> translate(-anchor)
  -> scale(percent / 100)
  -> rotate(clockwise)
  -> translate(position)
  -> parent world transform
```

Precomp transforms are composed recursively. Pixel aspect and comp/stage scale are explicit inputs.

## Native character

```json
{
  "schema": "algowzxd.native-rig",
  "schemaVersion": 1,
  "characterId": "algowzxd_2024_duik",
  "displayName": "Algowzxd - 2024 Duik Rig",
  "source": { "kind": "after-effects-duik" },
  "stage": {},
  "bones": [],
  "controllers": [],
  "constraints": [],
  "artwork": [],
  "originalRestPose": {},
  "referenceAnimations": [],
  "compatibility": {}
}
```

`originalRestPose` preserves the imported snapshot. A user-defined rest pose is stored separately.

## Controller targets

Automation targets controllers, not artwork:

```text
gesture clip -> controller track -> IK/constraint solver -> bones -> artwork
```

Body, head, hand, foot, root, gaze, and face controllers retain their imported source identity for debugging.

## Manual mapping

Heuristics normalize spaces, punctuation, side labels, and common terms, but the import page exposes every mapping. A correction changes conversion metadata, never the raw export.
