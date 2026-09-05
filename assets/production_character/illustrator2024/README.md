# Algowzxd 2024 Illustrator puppet

Generated, non-destructive SVG extraction of the user-approved Illustrator sources.

- `character.svg`: layered production puppet.
- `head/`: head, ears, hair, and the coordinate-matched neck from `head.ai`. Base eyebrows are intentionally excluded because every eye preset contains its own matched brows.
- `hoodie/`: fitted body, shaded hoodie, limbs, collar, and strings.
- `eyes/`: 12 separately extracted Illustrator eye layers.
- `mouths/`: all 12 vector mouth/viseme drawings from the Illustrator sheet.
- `manifest.json`: source bounds and alignment transform.

Regenerate with `tools/illustrator-import/extract_ai.py`. The `.ai` files are never modified.
