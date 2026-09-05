import { eyeExpressions, mouthPackBase, productionVisemes } from "../character/FaceAssets";
import { browPresets } from "../character/EyePresets";
import type { BrowPreset, EyeExpression, FaceAssetOverride, FaceAssetState, FaceState, ProductionViseme } from "../project/schema";
import { useState } from "react";

interface Props { assets: FaceAssetState; face: FaceState; onAssets(next: FaceAssetState): void; onFace(patch: Partial<FaceState>): void }

export function FaceAssetManager({ assets, face, onAssets, onFace }: Props) {
  const [error, setError] = useState("");
  const replaceMouth = async (viseme: ProductionViseme, file?: File) => {
    if (!file) return;
    const asset = await readAsset(file);
    onAssets({ ...assets, mouthOverrides: { ...assets.mouthOverrides, [viseme]: asset } });
  };
  const replaceEye = async (expression: EyeExpression, side: "left" | "right", file?: File) => {
    if (!file) return;
    const asset = await readAsset(file), current = assets.eyeOverrides[expression] ?? {};
    onAssets({ ...assets, eyeOverrides: { ...assets.eyeOverrides, [expression]: { ...current, [side]: asset } } });
  };
  const replaceBrow = async (preset: BrowPreset, side: "left" | "right", file?: File) => {
    if (!file) return;
    const asset = await readAsset(file), current = assets.browOverrides[preset] ?? {};
    onAssets({ ...assets, browOverrides: { ...assets.browOverrides, [preset]: { ...current, [side]: asset } } });
  };
  const importPack = async (file?: File) => {
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as Partial<FaceAssetState>;
    if (!parsed.mouthOverrides && !parsed.eyeOverrides && !parsed.browOverrides) throw new Error("Invalid face pack.");
    onAssets({ ...assets, ...parsed, mouthOverrides: parsed.mouthOverrides ?? assets.mouthOverrides, eyeOverrides: parsed.eyeOverrides ?? assets.eyeOverrides, browOverrides: parsed.browOverrides ?? assets.browOverrides });
  };
  const exportPack = () => download("algowzxd-face-pack.json", JSON.stringify(assets, null, 2));
  return <div className="face-assets">
    <div className="inspector-title"><span className="face-glyph">◆</span><div><strong>Face Asset Manager</strong><small>Local defaults · project custom assets</small></div></div>
    <section className="inspector-section"><header>ACTIVE EYE PACK</header><select value={assets.activeEyePack} onChange={(event) => onAssets({ ...assets, activeEyePack: event.target.value as FaceAssetState["activeEyePack"] })}><option value="raster-v1">Raster V1</option><option value="modular-v2">Modular Expressions V2</option><option value="expressive">Expressive</option><option value="classic">Classic Algowzxd</option><option value="anime-comedy">Anime / Comedy</option><option value="custom">Custom</option></select><a className="asset-qa-link" href="/assets/v2-qa">Open V2 asset QA contact sheet</a></section>
    <section className="inspector-section"><header>MOUTH DESIGN LAB · V3</header><div className="asset-grid">{productionVisemes.map((viseme) => {
      const custom = assets.mouthOverrides[viseme];
      return <article key={viseme} className={face.mouth === viseme ? "active" : ""}><button onClick={() => onFace({ mouth: viseme })}><img src={custom?.dataUrl ?? `${mouthPackBase}/${viseme}.svg`} alt={viseme}/><b>{viseme}</b></button><label>Replace<input type="file" accept="image/svg+xml,image/png,image/webp" onChange={(event) => void replaceMouth(viseme, event.target.files?.[0]).catch((reason) => setError(String(reason)))}/></label>{custom && <button className="asset-reset" onClick={() => { const next = { ...assets.mouthOverrides }; delete next[viseme]; onAssets({ ...assets, mouthOverrides: next }); }}>Reset</button>}</article>;
    })}</div><div className="asset-pack-actions"><button onClick={exportPack}>Export Pack</button><label>Import Pack<input type="file" accept="application/json,.json" onChange={(event) => void importPack(event.target.files?.[0]).catch((reason) => setError(String(reason)))}/></label></div></section>
    <section className="inspector-section"><header>EYE ASSETS</header><select value={face.eyeExpression} onChange={(event) => onFace({ eyeExpression: event.target.value as EyeExpression })}>{eyeExpressions.map((item) => <option key={item}>{item}</option>)}</select><div className="eye-upload-row">{(["left", "right"] as const).map((side) => <div key={side}><b>{side.toUpperCase()}</b><label>Replace<input type="file" accept="image/svg+xml,image/png,image/webp" onChange={(event) => void replaceEye(face.eyeExpression, side, event.target.files?.[0]).catch((reason) => setError(String(reason)))}/></label>{assets.eyeOverrides[face.eyeExpression]?.[side] && <button onClick={() => { const entry = { ...assets.eyeOverrides[face.eyeExpression] }; delete entry[side]; onAssets({ ...assets, eyeOverrides: { ...assets.eyeOverrides, [face.eyeExpression]: entry } }); }}>Reset</button>}</div>)}</div></section>
    <section className="inspector-section"><header>EYEBROW ASSETS</header><select value={face.browSystem.left.preset === "auto" ? "neutral" : face.browSystem.left.preset} onChange={(event) => onFace({ browSystem: { left: { ...face.browSystem.left, preset: event.target.value as BrowPreset }, right: { ...face.browSystem.right, preset: event.target.value as BrowPreset } } })}>{browPresets.map((item) => <option key={item}>{item}</option>)}</select><div className="eye-upload-row">{(["left", "right"] as const).map((side) => { const preset = face.browSystem[side].preset === "auto" ? "neutral" : face.browSystem[side].preset; return <div key={side}><b>{side.toUpperCase()}</b><label>Replace<input type="file" accept="image/svg+xml,image/png,image/webp" onChange={(event) => void replaceBrow(preset, side, event.target.files?.[0]).catch((reason) => setError(String(reason)))}/></label>{assets.browOverrides[preset]?.[side] && <button onClick={() => { const entry = { ...assets.browOverrides[preset] }; delete entry[side]; onAssets({ ...assets, browOverrides: { ...assets.browOverrides, [preset]: entry } }); }}>Reset</button>}</div>; })}</div></section>
    {error && <div className="asset-error">{error}</div>}
    <p className="face-help">SVG, transparent PNG, or WebP · maximum 2 MB. Custom files are stored inside the saved project; production V3 assets remain untouched.</p>
  </div>;
}

async function readAsset(file: File): Promise<FaceAssetOverride> {
  if (file.size > 2_000_000) throw new Error("Face asset must be smaller than 2 MB.");
  if (!["image/svg+xml", "image/png", "image/webp"].includes(file.type)) throw new Error("Use SVG, PNG, or WebP.");
  if (file.type === "image/svg+xml") { const source = await file.text(); if (!/^\s*<svg[\s>]/i.test(source) || !/viewBox\s*=/.test(source)) throw new Error("SVG must include a viewBox."); }
  const url = await dataUrl(file);
  if (file.type !== "image/svg+xml") await validateRaster(url);
  return { name: file.name, mimeType: file.type as FaceAssetOverride["mimeType"], dataUrl: url, updatedAt: new Date().toISOString() };
}
function dataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
function validateRaster(src: string) { return new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => { if (image.width < 8 || image.height < 4 || image.width > 4096 || image.height > 4096) return reject(new Error("Asset dimensions must be between 8×4 and 4096×4096.")); const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return reject(new Error("Could not inspect transparency.")); context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, image.width, image.height).data; for (let index = 3; index < pixels.length; index += Math.max(4, Math.floor(pixels.length / 3000 / 4) * 4)) if (pixels[index] < 250) return resolve(); reject(new Error("PNG/WebP must have a transparent background.")); }; image.onerror = () => reject(new Error("Could not decode the image.")); image.src = src; }); }
function download(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
