# Rig Schema

## Coordinate system

- Stage coordinates use the SVG viewBox: 1920x1080.
- Positive X points right; positive Y points down.
- Rotation is stored in degrees, clockwise in SVG space.
- Bone transforms are local to their parent.
- Artwork bindings retain their original SVG placement and receive a calculated delta matrix.

## Bone

```ts
interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  layerId?: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  length: number;
  pivotX: number;
  pivotY: number;
  minRotation: number;
  maxRotation: number;
  stiffness: number;
  visible: boolean;
  locked: boolean;
}
```

`x` and `y` are animation offsets. `pivotX` and `pivotY` are bind-pose stage positions. Limits are enforced by command creation and future constraints.

## Controller

```ts
interface Controller {
  id: string;
  name: string;
  boneId: string;
  kind: "transform" | "ik" | "gaze" | "face";
  color: string;
  size: number;
  visible: boolean;
  locked: boolean;
}
```

## Initial skeleton

```text
root
└── hips
    ├── torso
    │   ├── neck
    │   │   └── head
    │   ├── upperArmL -> forearmL -> handL
    │   └── upperArmR -> forearmR -> handR
    ├── thighL -> shinL -> footL
    └── thighR -> shinR -> footR
```

The first SVG does not contain separate hips, hands, chest, or face components. Logical bones may exist without an artwork binding; placeholders remain explicit in the asset audit.

## Transform evaluation

For each bone:

```text
local = translate(x, y)
      * translate(pivot)
      * rotate(rotation)
      * scale(scaleX, scaleY)
      * translate(-pivot)

world = parent.world * local
```

World matrices are computed in hierarchy order. Artwork uses the world matrix of its bound bone. Bone overlays use transformed bind pivots.

## Project versioning

Every rig document has `schemaVersion`. Loaders reject unsupported future versions and migrations upgrade known older versions without changing the archived artwork.

