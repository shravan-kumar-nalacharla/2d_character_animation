# Body rig repair baseline

Branch base: 369d276 (latest origin/main). Remote asset-contract-v2 is merged via PR #1; no open PRs. Prior body work was uncommitted and is preserved on the repair branch. Baseline: 73 tests pass; build passes; assets:validate fails because URL.pathname produces D:\D:\ and encoded spaces on Windows.

Coordinates: bones store pivots in the 1920×1080 artwork bind coordinate system. Their local delta matrices rotate around those pivots; Skeleton recursively multiplies parent × local. This is valid bind-space skeletal animation, not absolute world positioning. The defect is in BodyRig: hand offsets, poles and projected joints are mixed in world coordinates, lengths are taken from unprojected bind points, and the elbow pole can switch cross-product sign mid-motion.

Hoodie baseline: shoulders R(820,325), L(975,320); elbows R(790,420), L(1000,415); wrists R(790,535), L(1000,520). Neck pivot(895,270), head pivot(894,170) incorrectly rotates through the face. Hips(895,570); feet R(815,905), L(950,905). Torso owns body, collar, shadings and layer-18 artwork; layer-18-copy duplicates the lower torso; shadings contains unbound red arm-fill fragments. Head image has an additional source normalization matrix (.65 scale, 221.95,-72.55 translation).

Stick currently inherits every hoodie pivot and detailed hand/shoe attachment despite its narrower 190×300 shirt. This causes wrong proportions and shoulder placement.

Screenshots supplied by the user are acceptance failures: elbow silhouettes/overlap, wave shoulder artifact, thinking finger at nose, and unstable neck/attachments. Repair uses explicit character profiles, parent-space analytic solves, authored contact/pole configurations, and separate silhouette/attachment rules.

The wave protrusion was traced by rendering individual extracted SVG layers: `shadings.svg` contains two red arm-fill blobs. Curved mode omits this obsolete limb layer and the duplicated layer-18-copy; normal imported art rendering is unchanged.

## Implemented repair

- Parent-space arm/leg solves and inverse-parent controller dragging; exact shared socket/wrist transforms, shoulder overlap bridges, and profile-specific bind points.
- Hidden lower neck under the shirt/collar, skull-base rotation, constrained neck translation/bend, and preserved custom pivot edits.
- Stick: six-pixel round strokes, compact profile geometry, no hand or shoe images. Hoodie: consistent wrist aperture, smaller hand scale, dedicated curled chin support and cupped palm-up/grip silhouettes.
- Stable authored elbow-side selection blended from rest; paired folded-arm angles/layer order; chin/face contact targets follow the head.
- Soft IK reach, bend limits, optional angle-based IK/FK blend, stateless face exclusion and pose-validation helpers.
- Expanded semantic clip catalog, clip phases/contact metadata, walk/run/enter/exit tracks, easing into and out of planted locomotion, and cumulative travel across clips.
- `/rig/body-qa` compares both characters with pose/view/time/head controls and diagnostic overlays. Regression videos use six clips × 120 frames for each skin.

## Scope of validation

Unit tests exercise transforms, profile migration, attachment distances through the screenshot-failure clips, soft/mirrored IK, IK/FK length preservation, basic collision reporting, deterministic planning, manual priority, multilingual visemes and the existing face suite. Screenshots under `docs/body-qa/after-*` are actual QA-page captures; `before-*` are the user's supplied failure screenshots, not reconstructed captures.

The collision validator is geometric and pose-aware, not a physics/contact solver for arbitrary manually authored scenes. Detailed prop geometry, camera choreography and acoustic forced alignment are not implemented. Side/rear skins remain simplified vector silhouettes; orientation changes use discrete drawings. The broader cinematic automation roadmap is therefore not fully complete.
