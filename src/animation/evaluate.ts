import type { AnimationKeyframe, AnimationTrack, Bone, FaceState } from "../project/schema";

const cursors = new WeakMap<AnimationTrack, { index: number; time: number }>();

export function evaluateTrack(track: AnimationTrack, time: number) {
  if (track.muted || !track.keyframes.length) return undefined;
  const keys = track.keyframes;
  if (time <= keys[0].time) return keys[0].value;
  if (time >= keys[keys.length - 1].time) return keys[keys.length - 1].value;
  const cached = cursors.get(track);
  let index = cached?.index ?? -1;
  if (cached && time >= cached.time && keys[index]?.time <= time && time < keys[index + 1]?.time) {
    // Forward playback remains in the same segment.
  } else if (cached && time >= cached.time && keys[index + 1]?.time <= time) {
    while (index + 1 < keys.length - 1 && keys[index + 1].time <= time) index++;
  } else {
    let low = 0, high = keys.length - 1;
    while (low + 1 < high) { const middle = (low + high) >>> 1; if (keys[middle].time <= time) low = middle; else high = middle; }
    index = low;
  }
  cursors.set(track, { index, time });
  const previous = keys[index];
  const next = keys[index + 1];
  if (typeof previous.value !== "number" || typeof next.value !== "number" || previous.interpolation === "hold") return previous.value;
  const progress = (time - previous.time) / Math.max(0.0001, next.time - previous.time);
  return previous.value + (next.value - previous.value) * ease(progress, previous);
}

export function evaluateFace(base: FaceState, tracks: AnimationTrack[], time: number): FaceState {
  const face: FaceState = { ...base, cryControls: { ...base.cryControls }, parts: { ...base.parts, browL: { ...base.parts.browL }, browR: { ...base.parts.browR } }, eyeSystem: { left: { ...base.eyeSystem.left }, right: { ...base.eyeSystem.right } }, browSystem: { left: { ...base.browSystem.left }, right: { ...base.browSystem.right } }, accessories: { sunglasses: { ...base.accessories.sunglasses } } };
  for (const track of tracks) {
    const value = evaluateTrack(track, time);
    if (value === undefined) continue;
    if (track.target === "face.mouth" && typeof value === "string") face.mouth = value as FaceState["mouth"];
    else if (track.target === "face.eyeExpression" && typeof value === "string") face.eyeExpression = value as FaceState["eyeExpression"];
    else if (track.target === "face.eyeSystem.left.expression" && typeof value === "string") face.eyeSystem.left.expression = value as FaceState["eyeSystem"]["left"]["expression"];
    else if (track.target === "face.eyeSystem.right.expression" && typeof value === "string") face.eyeSystem.right.expression = value as FaceState["eyeSystem"]["right"]["expression"];
    else if (track.target === "face.browSystem.left.preset" && typeof value === "string") face.browSystem.left.preset = value as FaceState["browSystem"]["left"]["preset"];
    else if (track.target === "face.browSystem.right.preset" && typeof value === "string") face.browSystem.right.preset = value as FaceState["browSystem"]["right"]["preset"];
    else if (track.target === "face.accessories.sunglasses.visible" && typeof value === "boolean") face.accessories.sunglasses.visible = value;
    else if (track.target === "face.gazeX" && typeof value === "number") face.gazeX = value;
    else if (track.target === "face.gazeY" && typeof value === "number") face.gazeY = value;
    else if (track.target === "face.blink" && typeof value === "number") face.blink = value;
    else if (track.target === "face.eyeOpenness" && typeof value === "number") face.eyeOpenness = value;
    else if (track.target === "face.cryControls.state" && typeof value === "string") face.cryControls.state = value as FaceState["cryControls"]["state"];
    else if (track.target === "face.mouthOffsetX" && typeof value === "number") face.mouthOffsetX = value;
    else if (track.target === "face.mouthOffsetY" && typeof value === "number") face.mouthOffsetY = value;
    else if (track.target === "face.mouthRotation" && typeof value === "number") face.mouthRotation = value;
    else if (track.target === "face.jawOpen" && typeof value === "number") face.jawOpen = value;
    else if (track.target === "face.mouthWidth" && typeof value === "number") face.mouthWidth = value;
    else if (track.target === "face.lipRound" && typeof value === "number") face.lipRound = value;
    else if (track.target === "face.lipPress" && typeof value === "number") face.lipPress = value;
    else if (track.target === "face.mouthIntensity" && typeof value === "number") face.mouthIntensity = value;
    else if (track.target === "face.parts.browL.y" && typeof value === "number") face.parts.browL.y = base.parts.browL.y + value;
    else if (track.target === "face.parts.browR.y" && typeof value === "number") face.parts.browR.y = base.parts.browR.y + value;
    else {
      const eye = track.target.match(/^face\.eyeSystem\.(left|right)\.(scaleX|scaleY|openness|squint|rotation|pupilScale|pupilX|pupilY)$/);
      const brow = track.target.match(/^face\.browSystem\.(left|right)\.(x|y|rotation|scaleX|scaleY|innerHeight|outerHeight|curve|intensity)$/);
      const glasses = track.target.match(/^face\.accessories\.sunglasses\.(scale|offsetX|offsetY|rotation|opacity)$/);
      const cry = track.target.match(/^face\.cryControls\.(shakeAmount|shakeFrequency|shakeVerticalRatio|shakeRotation|flowSpeed|turbulenceAmount|turbulenceSize|opacity|amount)$/);
      if (eye && typeof value === "number") (face.eyeSystem[eye[1] as "left" | "right"] as unknown as Record<string, number>)[eye[2]] = value;
      else if (brow && typeof value === "number") (face.browSystem[brow[1] as "left" | "right"] as unknown as Record<string, number>)[brow[2]] = value;
      else if (glasses && typeof value === "number") (face.accessories.sunglasses as unknown as Record<string, number>)[glasses[1]] = value;
      else if (cry && typeof value === "number") (face.cryControls as unknown as Record<string, number>)[cry[1]] = value;
    }
  }
  return face;
}

export function evaluateBones(base: Bone[], tracks: AnimationTrack[], time: number): Bone[] {
  return base.map((bone) => {
    const result = { ...bone };
    for (const track of tracks) {
      const prefix = `bone.${bone.id}.`;
      if (!track.target.startsWith(prefix)) continue;
      const value = evaluateTrack(track, time);
      const property = track.target.slice(prefix.length);
      if (typeof value === "number" && (property === "x" || property === "y" || property === "rotation" || property === "scaleX" || property === "scaleY")) result[property] = bone[property] + value;
    }
    return result;
  });
}

function ease(value: number, key: AnimationKeyframe) {
  const t = Math.max(0, Math.min(1, value));
  if (key.interpolation === "linear") return t;
  if (key.interpolation === "ease-in") return t * t;
  if (key.interpolation === "ease-out") return 1 - (1 - t) * (1 - t);
  if (key.interpolation === "bezier" && key.easing) return cubic(t, key.easing.y1, key.easing.y2);
  return t * t * (3 - 2 * t);
}

function cubic(t: number, y1: number, y2: number) { const one = 1 - t; return 3 * one * one * t * y1 + 3 * one * t * t * y2 + t * t * t; }
