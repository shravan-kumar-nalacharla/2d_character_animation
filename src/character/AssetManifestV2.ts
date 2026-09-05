export const characterViews = ["front", "threeQuarterLeft", "threeQuarterRight", "sideLeft", "sideRight", "back"] as const;
export type CharacterView = typeof characterViews[number];

export const attachmentSlots = [
  "eye.left", "eye.right", "eyebrow.left", "eyebrow.right", "mouth.silent", "face.shading",
  "hand.left", "hand.right", "shoe.left", "shoe.right", "leg.left.thigh", "leg.left.shin",
  "leg.right.thigh", "leg.right.shin", "joint.elbow", "joint.knee", "joint.wrist", "joint.ankle",
] as const;
export type AttachmentSlot = typeof attachmentSlots[number];
export type AssetFormat = "png" | "svg" | "webp";

export interface Point2D { x: number; y: number }
export interface Bounds2D { x: number; y: number; width: number; height: number }

export interface AttachmentAsset {
  id: string;
  path: string;
  format: AssetFormat;
  slot: AttachmentSlot;
  view: CharacterView;
  width: number;
  height: number;
  anchor: Point2D;
  bounds: Bounds2D;
  tags: string[];
  handedness?: "left" | "right" | "none";
  mirrorSafe?: boolean;
  sha256?: string;
}

export interface HandPoseAsset extends AttachmentAsset {
  slot: "hand.left" | "hand.right";
  handedness: "left" | "right";
  pose: string;
  compatibleProps: string[];
}

export interface ShoeAsset extends AttachmentAsset {
  slot: "shoe.left" | "shoe.right";
  handedness: "left" | "right";
  stance: "normal" | "side";
}

export interface ExpressionPresetV2 {
  id: string;
  label: string;
  emotionTags: string[];
  leftEye: string;
  rightEye: string;
  leftEyebrow: string;
  rightEyebrow: string;
  silentMouth: string;
  shading: string;
}

export interface ViewPack {
  view: CharacterView;
  assetIds: string[];
  available: boolean;
}

export interface CharacterAssetManifestV2 {
  schemaVersion: 2;
  id: string;
  character: string;
  revision: number;
  sideConvention: "character";
  designRules: {
    ageStyle: "teen";
    facialHair: false;
    eyebrowColor: "black";
    pupilPalette: string[];
  };
  assets: AttachmentAsset[];
  hands: HandPoseAsset[];
  shoes: ShoeAsset[];
  expressions: ExpressionPresetV2[];
  views: ViewPack[];
}

export interface ManifestIssue { level: "error" | "warning"; path: string; message: string }

export function validateCharacterAssetManifestV2(value: unknown): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  if (!value || typeof value !== "object") return [{ level: "error", path: "$", message: "Manifest must be an object." }];
  const manifest = value as Partial<CharacterAssetManifestV2>;
  if (manifest.schemaVersion !== 2) issues.push({ level: "error", path: "schemaVersion", message: "Expected Asset Contract schemaVersion 2." });
  if (!manifest.id) issues.push({ level: "error", path: "id", message: "Manifest id is required." });
  if (!Array.isArray(manifest.assets)) issues.push({ level: "error", path: "assets", message: "Assets must be an array." });
  if (!Array.isArray(manifest.expressions)) issues.push({ level: "error", path: "expressions", message: "Expressions must be an array." });
  if (!Array.isArray(manifest.hands)) issues.push({ level: "error", path: "hands", message: "Hands must be an array." });
  if (!Array.isArray(manifest.shoes)) issues.push({ level: "error", path: "shoes", message: "Shoes must be an array." });
  if (!Array.isArray(manifest.views)) issues.push({ level: "error", path: "views", message: "Views must be an array." });
  if (issues.some((issue) => issue.level === "error")) return issues;

  const allAssets = [...manifest.assets!, ...manifest.hands!, ...manifest.shoes!];
  const ids = new Set<string>();
  for (const [index, asset] of allAssets.entries()) {
    const path = `assets[${index}]`;
    if (!asset.id || ids.has(asset.id)) issues.push({ level: "error", path: `${path}.id`, message: asset.id ? `Duplicate asset id ${asset.id}.` : "Asset id is required." });
    ids.add(asset.id);
    if (!asset.path || asset.path.startsWith("/") || asset.path.includes("..")) issues.push({ level: "error", path: `${path}.path`, message: "Asset path must be relative and stay inside the pack." });
    if (!attachmentSlots.includes(asset.slot)) issues.push({ level: "error", path: `${path}.slot`, message: `Unknown attachment slot ${asset.slot}.` });
    if (!(asset.width > 0 && asset.height > 0)) issues.push({ level: "error", path: path, message: "Asset dimensions must be positive." });
    if (!inside(asset.anchor, asset.width, asset.height)) issues.push({ level: "error", path: `${path}.anchor`, message: "Anchor must be inside the asset canvas." });
  }
  for (const [index, expression] of manifest.expressions!.entries()) {
    for (const field of ["leftEye", "rightEye", "leftEyebrow", "rightEyebrow", "silentMouth", "shading"] as const) {
      if (!ids.has(expression[field])) issues.push({ level: "error", path: `expressions[${index}].${field}`, message: `Missing linked asset ${expression[field]}.` });
    }
  }
  const pairs = new Map<string, Set<string>>();
  for (const asset of allAssets) {
    if (!asset.handedness || asset.handedness === "none") continue;
    const key = asset.id.replace(/(^|[.-])(left|right)(?=[.-]|$)/g, "$1side");
    const pair = pairs.get(key) ?? new Set<string>(); pair.add(asset.handedness); pairs.set(key, pair);
  }
  for (const [key, pair] of pairs) if (pair.size === 1) issues.push({ level: "warning", path: key, message: "Only one handed side is present." });
  return issues;
}

export function assertCharacterAssetManifestV2(value: unknown): asserts value is CharacterAssetManifestV2 {
  const errors = validateCharacterAssetManifestV2(value).filter((issue) => issue.level === "error");
  if (errors.length) throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
}

export async function loadCharacterAssetManifestV2(url = "/production_character/v2/manifest.json", fetcher: typeof fetch = fetch) {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Could not load character manifest (${response.status}).`);
  const value: unknown = await response.json();
  assertCharacterAssetManifestV2(value);
  return value;
}

function inside(point: Point2D, width: number, height: number) { return point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height; }
