# Production performance assets

Original Illustrator documents are never overwritten. `tools/illustrator-import/extract_performance.py` reads their PDF-compatible content and writes normalized SVGs here.

- Hoodie front torso remains the existing illustrator2024 production binding, sourced from `algowzxd hoodie own.ai`.
- Front, quarter and rear heads are cropped from the original 360-head Illustrator sheet. Face components remain independently animated.
- Left/right profile heads are newly drawn SVG silhouettes referencing that sheet. They have distinct nose, ear and hair profiles; they are not scaled front faces.
- The stick shirt is extracted from `algowzxd stick man final Pakka.ai`.
- Profile/rear body silhouettes and curved limbs are rendered in `src/editor/BodyRig.tsx`; these are simplified new vector skins, not extracted multi-view garment drawings.
- Twenty-one hand SVGs are newly authored cartoon silhouettes. The revised shapes use rounded palms, tapered wrists and softly separated fingers. Thinking, folded, palm-up, facepalm and grip poses have dedicated silhouettes. Stop/open and panic/open share silhouettes; sleeve and wrist motion remain separate.
- Hoodie and stick manifests define separate skin dimensions and colors over one skeleton and performance API. The extraction script also emits their runtime copies under `src/character/manifests`.

No raster generation or Illustrator plug-in is required at playback. Asset extraction requires PyMuPDF; normal build/playback does not.

Profiles are now schemaVersion 2 and include bind pivots, limits, attachment slots, collision bounds and the neck anchor. Stick profiles explicitly forbid detailed hand/shoe attachments. The extraction script preserves reviewed profile geometry when re-extracting source vectors.
