# Current Project Audit

## Executive summary

The repository began as a 529 MiB character-art and animation archive containing 306 files. It did not contain application source code, a package manifest, tests, or an editor UI. The archive is preserved in place and is treated as read-only source material.

The strongest implementation path is a browser-first TypeScript/React editor using inline SVG artwork, a project-owned skeletal rig, deterministic animation data, and FFmpeg for final media encoding. After Effects, Duik, Adobe Character Animator, and their project formats are not runtime dependencies.

## Inventory

| Area | Files | Approx. size | Use |
| --- | ---: | ---: | --- |
| `adobe animate and illustrator saves (imp)` | 82 | 56.45 MiB | Primary vector, FLA, and historical rig sources |
| `ae animation files` | 29 | 113.22 MiB | Historical animation references only |
| `algowzxd character parts (imp)` | 127 | 57.74 MiB | Expressions, eyes, mouths, PSD exports, concepts |
| `Animation green screens` | 10 | 255.32 MiB | Rendered reference clips, not rig sources |
| `character variations` | 16 | 4.09 MiB | Inconsistent generated concepts |
| `CHMouthPack` | 10 | 7.15 MiB | Viseme naming and artwork reference |
| Other stock/reference folders | 25 | 12.6 MiB | Hoodie, hands, eyes, drawings, and archives |

Extension totals include 157 PNG, 39 AEP, 26 SVG, 24 AI, 12 MP4, 11 JPG, 11 PSD, 10 TXT, 5 ZIP, 4 EPS, 3 FLA, 3 PDF, and one BLEND file.

## Existing source formats

- The 26 SVG files parse successfully. The selected full-body SVG contains separately addressable vector groups.
- The three FLA files are readable ZIP/XFL containers. The symbolized character contains 25 body and face layers but no animation beyond its first frame.
- The 39 AEP files contain historical Duik controls and autosaves. They are references only.
- The 24 AI files are PDF-compatible Illustrator files. Their optional-content layer names can be extracted non-destructively into runtime SVG groups.
- Nine real PSD files decode correctly. The likely 1920x1080 character PSD contains one flattened `Background` layer and is not riggable.
- All 168 raster images and all 12 MP4 files decode correctly.
- All five ZIP archives pass integrity checks.
- `CHMouthPack/__MACOSX/._*` entries are metadata forks, not artwork.

## Canonical source

The initial SVG has been superseded by the approved 2024 Illustrator sources:

`head.ai`, `troat.ai`, `algowzxd hoodie own.ai`, `algowzxd eyes illustrators.ai`, and `algowzxd mouht pieces.ai`.

Their production extraction is `assets/production_character/illustrator2024/character.svg`, with 14 hoodie/body layers, four head/throat layers, 12 separated eye variants, and 12 vector mouths. Original AI files remain untouched.

## Development environment

- Node.js 24 and pnpm 11 are available through the bundled workspace runtime.
- FFmpeg and FFprobe are installed.
- Photoshop 2026 is installed.
- Illustrator, Animate, After Effects, Character Animator, and Blender are not required by the application.

## Repository policy

- Original archive folders are never overwritten.
- Cleaned or normalized artwork belongs under `assets/production_character/`.
- Application source belongs under `src/`.
- Generated analysis and animation data belongs in project files, not in source artwork.
