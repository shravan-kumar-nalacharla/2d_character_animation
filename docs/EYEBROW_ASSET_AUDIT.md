# Eyebrow asset audit

The classic folders contain useful left/right brows for normal, sad, closed, curious and shock expressions, but several eye sets have no brow components and the directional curious sets duplicate brow artwork.

| Area | Verdict | Action |
|---|---|---|
| Normal and sad brows | KEEP | Preserve in Classic Algowzxd mode. |
| Curious left/middle/right brows | DUPLICATE | Preserve for compatibility; expressive mode uses one independent parametric shape per side. |
| Closed and shock brows | REDRAW | Recreated as scalable Bézier presets to avoid baked eye/brow combinations. |
| Angry, serious and cunning missing brows | INCOMPLETE | Filled by independent `angry`, `serious`, `determined`, `suspicious` and `cunning` presets. |

The V5 eyebrow system exposes neutral, soft, raised, very-raised, inner/outer-raised, sad, concerned, worried, curious, suspicious, cunning, angry, very-angry, serious, determined, excited and anime-angry presets. Left and right brows have independent position, rotation, scale, inner height, outer height, curve and intensity. Uploaded brow overrides are stored separately from eye overrides.
