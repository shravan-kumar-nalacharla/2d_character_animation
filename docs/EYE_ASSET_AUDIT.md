# Eye asset audit

Scope: `assets/production_character/illustrator2024/eyes`. The reference-image analysis is implemented as the procedural `expressive-v1` pack; the original SVG library remains available as the Classic Algowzxd pack.

| Existing group | Verdict | Reason / action |
|---|---|---|
| `normal-eyes-2` | KEEP | Clean separated left/right baseline and brows; preserved for classic compatibility. |
| `sad-eyes` | KEEP | Useful readable silhouette; preserved and represented parametrically by `sad`/`verySad`. |
| `angry-eyes` | KEEP / IMPROVE | Strong source shape but missing separate brow files; new renderer supplies independent brows. |
| `serious-eyes` | KEEP / IMPROVE | Useful narrow silhouette; new `focused` and `determined` variants extend it. |
| `cunning-eyes` | KEEP / IMPROVE | Useful asymmetry seed; independent brow controls now complete it. |
| `closed-eyes` | KEEP | Good classic compatibility; new closed, happy-closed and laugh-closed curves are parametric. |
| `shock-eyes` | REDRAW | Original reads too close to ordinary open eyes at preview size; replaced by white, enlarged, small-pupil shock tiers. |
| `curious-eyes-left/middle/right` | LEGACY / DUPLICATE | Gaze is baked into three asset sets. Preserved in classic mode; expressive mode separates emotion from pupil gaze. |
| `seeing-left/right` | LEGACY / DUPLICATE | Direction-only duplicates. Use independent gaze X/Y in expressive mode. |
| root-level flattened `*-eyes.svg` files | LEGACY | Exported composites duplicate the component folders. Retained so old projects do not break. |

The new pack supports simple black-dot eyes, white cartoon eyes, anime/comedy eyes, sparkle/highlight eyes, closed arcs, asymmetric winks, tears, pupil scaling and independent per-side transforms. No classic file was deleted or overwritten.
