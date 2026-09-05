import { productionVisemes } from "./FaceAssets";
import type { FaceAssetState } from "../project/schema";

const eyeFolders = ["normal-eyes-2", "sad-eyes", "cunning-eyes", "serious-eyes", "curious-eyes-middle", "angry-eyes", "shock-eyes", "closed-eyes"];
const loaded = new Set<string>();

export async function preloadFaceAssets(assets?: FaceAssetState) {
  const urls = [
    ...productionVisemes.map((name) => `/production_character/illustrator2024/face/mouths/v3/${name}.svg`),
    ...eyeFolders.flatMap((folder) => ["eye-l.svg", "eye-r.svg", "brow-l.svg", "brow-r.svg", "highlight-l.svg", "highlight-r.svg"].map((file) => `/production_character/illustrator2024/eyes/${folder}/${file}`)),
    ...Object.values(assets?.mouthOverrides ?? {}).flatMap((item) => item ? [item.dataUrl] : []),
    ...Object.values(assets?.eyeOverrides ?? {}).flatMap((pair) => [pair?.left?.dataUrl, pair?.right?.dataUrl].filter((url): url is string => Boolean(url))),
  ].filter((url) => !loaded.has(url));
  await Promise.all(urls.map((url) => new Promise<void>((resolve) => { const image = new Image(); image.onload = image.onerror = () => { loaded.add(url); resolve(); }; image.src = url; if (image.decode) void image.decode().then(() => { loaded.add(url); resolve(); }).catch(() => undefined); })));
}
