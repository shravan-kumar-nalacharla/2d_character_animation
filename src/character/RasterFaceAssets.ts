import type { EyeExpression } from "../project/schema";

export type RasterEyeKey = "angry_01" | "angry_squint" | "angry_glare" | "annoyed" | "cute_sparkle" | "watery_sad" | "crying_squeezed";

export interface RasterEyeAsset {
  key: RasterEyeKey;
  width: number;
  height: number;
  browWidth: number;
  browHeight: number;
}

const root = "/production_character/raster_face_v1";

export const rasterEyes: Partial<Record<EyeExpression, RasterEyeAsset>> = {
  angry: { key: "angry_01", width: 48, height: 37, browWidth: 42, browHeight: 20 },
  veryAngry: { key: "angry_01", width: 50, height: 38, browWidth: 44, browHeight: 21 },
  angrySqueezed: { key: "angry_squint", width: 44, height: 22, browWidth: 43, browHeight: 19 },
  coldGlare: { key: "angry_glare", width: 53, height: 18, browWidth: 45, browHeight: 17 },
  determined: { key: "angry_glare", width: 52, height: 18, browWidth: 44, browHeight: 17 },
  animeDetermined: { key: "angry_glare", width: 54, height: 19, browWidth: 46, browHeight: 18 },
  rage: { key: "angry_glare", width: 55, height: 19, browWidth: 47, browHeight: 18 },
  annoyed: { key: "annoyed", width: 46, height: 19, browWidth: 39, browHeight: 14 },
  unimpressed: { key: "annoyed", width: 46, height: 19, browWidth: 39, browHeight: 14 },
  deadpan: { key: "annoyed", width: 46, height: 19, browWidth: 39, browHeight: 14 },
  bored: { key: "annoyed", width: 45, height: 18, browWidth: 38, browHeight: 14 },
  sparkleCute: { key: "cute_sparkle", width: 60, height: 71, browWidth: 39, browHeight: 20 },
  animeCute: { key: "cute_sparkle", width: 60, height: 71, browWidth: 39, browHeight: 20 },
  pleading: { key: "cute_sparkle", width: 60, height: 71, browWidth: 39, browHeight: 20 },
  teary: { key: "watery_sad", width: 64, height: 37, browWidth: 41, browHeight: 22 },
  verySad: { key: "watery_sad", width: 63, height: 37, browWidth: 41, browHeight: 22 },
  crying: { key: "watery_sad", width: 64, height: 37, browWidth: 41, browHeight: 22 },
  sobCrying: { key: "crying_squeezed", width: 48, height: 18, browWidth: 45, browHeight: 17 },
};

export const rasterEyeUrl = (key: RasterEyeKey, side: "left" | "right") => `${root}/eyes/${key}_${side}.png`;
export const rasterBrowUrl = (key: RasterEyeKey, side: "left" | "right") => `${root}/eyebrows/${key}_${side}.png`;
export const faceFxUrl = (name: "angry_shadow" | "anger_cross_01" | "anger_cross_02" | "anger_vein_01") => `${root}/face_fx/${name}.png`;
export const tearUrl = (side: "left" | "right") => `${root}/tears/waterfall_${side}.png`;

export const rasterEyeMetadata: Record<RasterEyeKey, { anchor: [number, number]; pupilCenter: [number, number]; baseline: number; safeMargin: number }> = Object.fromEntries(
  (["angry_01", "angry_squint", "angry_glare", "annoyed", "cute_sparkle", "watery_sad", "crying_squeezed"] as RasterEyeKey[]).map((key) => [key, { anchor: [.5, .5], pupilCenter: [.5, .52], baseline: .82, safeMargin: key === "cute_sparkle" || key === "watery_sad" ? .15 : .03 }]),
) as Record<RasterEyeKey, { anchor: [number, number]; pupilCenter: [number, number]; baseline: number; safeMargin: number }>;
