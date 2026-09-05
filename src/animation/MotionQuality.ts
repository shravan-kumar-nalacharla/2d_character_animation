import type { AnimationTrack } from "../project/schema";

const limits: Array<[RegExp, number]> = [[/bone\.(head|neck)\.rotation$/, 90], [/face\.gaze[XY]$/, 4], [/face\.mouthOffset[XY]$/, 45], [/bone\..+\.[xy]$/, 120]];

export function sanitizeMotionTracks(tracks: AnimationTrack[]) {
  return tracks.map((track) => {
    if (track.valueType !== "number") return track;
    const limit = limits.find(([pattern]) => pattern.test(track.target))?.[1];
    let reductions = 0, velocityClamps = 0;
    const keyframes = track.keyframes.slice().sort((a, b) => a.time - b.time).filter((key, index, all) => {
      const previous = all[index - 1]; if (!previous || key.time - previous.time >= 1 / 120 || key.value !== previous.value) return true; reductions++; return false;
    }).map((key, index, all) => {
      const previous = all[index - 1];
      if (!limit || !previous || typeof key.value !== "number" || typeof previous.value !== "number") return key;
      const maximum = limit * Math.max(1 / 120, key.time - previous.time), delta = key.value - previous.value;
      if (Math.abs(delta) <= maximum) return key;
      velocityClamps++; return { ...key, value: previous.value + Math.sign(delta) * maximum };
    });
    return { ...track, keyframes, metadata: { ...track.metadata, motionQuality: { reductions, velocityClamps, velocityLimit: limit ?? null } } };
  });
}
