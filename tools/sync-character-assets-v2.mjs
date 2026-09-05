#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { inflateSync } from "node:zlib";

const projectRoot = new URL("../", import.meta.url).pathname;
const packRoot = join(projectRoot, "assets/production_character/v2");
const sourceIndex = process.argv.indexOf("--expression-source");
const expressionSource = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
const validateOnly = process.argv.includes("--validate-only");

const slugs = ["confident-grin","serious-tired","shocked-alert","angry-gritted-teeth","calm-knowing-smile","rage-scream","intense-shadow-stare","power-rage","soft-surprise","soft-toothy-grin","soft-cheerful-open-smile","extreme-eye-shock","stern-focused","narrowed-suspicious","neutral-attentive","happy-closed-eye-smile","sad-teary","crying-breakdown","worried-anxious","scared-terrified","confused","disgusted","embarrassed-blush","excited-delight","sleepy-drowsy","bored-unimpressed","mischievous-smirk","determined-heroic","laughing-hard","pain-wince"];
const partSources = { "left-eye":"01-Left-Eye", "right-eye":"02-Right-Eye", "left-eyebrow":"03-Left-Eyebrow", "right-eyebrow":"04-Right-Eyebrow", mouth:"05-Mouth", "face-shading":"06-Face-Shading" };
const partSlots = { "left-eye":"eye.left", "right-eye":"eye.right", "left-eyebrow":"eyebrow.left", "right-eyebrow":"eyebrow.right", mouth:"mouth.silent", "face-shading":"face.shading" };

if (!validateOnly) {
  await generateAttachments();
  if (expressionSource) await importExpressions(expressionSource);
}

const manifest = await buildManifest();
if (!validateOnly) await writeFile(join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const issues = await validateFiles(manifest);
for (const issue of issues) console.error(`${issue.level.toUpperCase()} ${issue.path}: ${issue.message}`);
if (issues.some((issue) => issue.level === "error")) process.exitCode = 1;
else console.log(`Asset Contract V2 valid: ${manifest.expressions.length} expressions, ${manifest.hands.length} hands, ${manifest.shoes.length} shoes, ${manifest.assets.length + manifest.hands.length + manifest.shoes.length} files.`);

async function importExpressions(source) {
  const expressionRoot = join(packRoot, "face/expressions");
  const assets = [];
  for (const [part, folder] of Object.entries(partSources)) {
    await mkdir(join(expressionRoot, part), { recursive: true });
    for (let index = 0; index < slugs.length; index++) {
      const number = String(index + 1).padStart(2, "0"), slug = slugs[index], filename = `${number}-${slug}_${part}.png`;
      const from = join(source, folder, filename), to = join(expressionRoot, part, filename);
      await copyFile(from, to);
      assets.push(await pngAsset(to, `expression.${slug}.${part}`, partSlots[part], part.includes("left") ? "left" : part.includes("right") ? "right" : "none", ["expression", slug, part]));
    }
  }
  const expressions = slugs.map((slug) => ({ id: slug, label: title(slug), emotionTags: slug.split("-"), leftEye: `expression.${slug}.left-eye`, rightEye: `expression.${slug}.right-eye`, leftEyebrow: `expression.${slug}.left-eyebrow`, rightEyebrow: `expression.${slug}.right-eyebrow`, silentMouth: `expression.${slug}.mouth`, shading: `expression.${slug}.face-shading` }));
  await writeFile(join(expressionRoot, "manifest.json"), JSON.stringify({ schemaVersion: 2, sideConvention: "character", assets, expressions }, null, 2) + "\n");
}

async function generateAttachments() {
  const poseNames = ["relaxed","fist","point","palm-up","palm-out","thumbs-up","chin-touch","facepalm","count-one","count-two","count-three","phone-grip","object-grip","controller-grip","hands-on-hips","panic-claw"];
  const hands = [];
  for (const side of ["left", "right"]) {
    const folder = join(packRoot, `hands/${side}`); await mkdir(folder, { recursive: true });
    for (const pose of poseNames) {
      const path = join(folder, `${pose}.svg`); await writeFile(path, handSvg(pose, side));
      hands.push(svgAsset(path, `hand.${pose}.${side}`, `hand.${side}`, side, { x: side === "left" ? 22 : 138, y: 88 }, ["hand", pose], { pose, compatibleProps: pose.includes("grip") ? [pose.replace("-grip", "")] : [] }));
    }
  }
  const shoes = [];
  for (const side of ["left", "right"]) {
    const folder = join(packRoot, `shoes/${side}`); await mkdir(folder, { recursive: true });
    const path = join(folder, "normal.svg"); await writeFile(path, shoeSvg(side));
    shoes.push(svgAsset(path, `shoe.normal.${side}`, `shoe.${side}`, side, { x: side === "left" ? 68 : 152, y: 25 }, ["shoe", "sneaker", "normal"], { stance: "normal" }, 220, 140));
  }
  const bodyAssets = [], legacyRoot = join(projectRoot, "assets/production_character/illustrator2024/hoodie");
  for (const side of ["left", "right"]) for (const segment of ["thigh", "shin"]) {
    const sourceName = segment === "shin" ? `${side}-leg.svg` : `${side}-thigh.svg`, folder = join(packRoot, `legs/${side}`), path = join(folder, `${segment}.svg`); await mkdir(folder, { recursive: true }); await copyFile(join(legacyRoot, sourceName), path);
    const anchor = side === "left" ? (segment === "thigh" ? { x: 945, y: 585 } : { x: 950, y: 740 }) : (segment === "thigh" ? { x: 835, y: 590 } : { x: 835, y: 735 });
    bodyAssets.push(svgAsset(path, `leg.${side}.${segment}`, `leg.${side}.${segment}`, side, anchor, ["leg", segment, "legacy-art", segment === "shin" ? "shoe-overlay-ready" : "independent-segment"], {}, 1920, 1080));
  }
  for (const joint of ["elbow", "knee", "wrist", "ankle"]) { const folder = join(packRoot, "joints"), path = join(folder, `${joint}-cap.svg`); await mkdir(folder, { recursive: true }); await writeFile(path, jointSvg(joint)); bodyAssets.push(svgAsset(path, `joint.${joint}.cap`, `joint.${joint}`, "none", { x: 48, y: 48 }, ["joint-cap", joint, "overlap"], { mirrorSafe: true }, 96, 96)); }
  await writeFile(join(packRoot, "attachments-manifest.json"), JSON.stringify({ schemaVersion: 2, bodyAssets, hands, shoes }, null, 2) + "\n");
}

async function buildManifest() {
  const expressionManifest = JSON.parse(await readFile(join(packRoot, "face/expressions/manifest.json"), "utf8"));
  const attachmentManifest = JSON.parse(await readFile(join(packRoot, "attachments-manifest.json"), "utf8"));
  const assets = [...expressionManifest.assets, ...(attachmentManifest.bodyAssets ?? [])];
  return { schemaVersion: 2, id: "algowzxd-production-character-v2", character: "Algowzxd", revision: 1, sideConvention: "character", designRules: { ageStyle: "teen", facialHair: false, eyebrowColor: "black", pupilPalette: ["#080a0d", "#111318", "#2d3540"] }, assets, hands: attachmentManifest.hands, shoes: attachmentManifest.shoes, expressions: expressionManifest.expressions, views: [{ view: "front", available: true, assetIds: [...assets.map((asset) => asset.id), ...attachmentManifest.hands.map((asset) => asset.id), ...attachmentManifest.shoes.map((asset) => asset.id)] }, ...["threeQuarterLeft","threeQuarterRight","sideLeft","sideRight","back"].map((view) => ({ view, available: false, assetIds: [] }))] };
}

async function validateFiles(manifest) {
  const issues = [], ids = new Set(), hashes = new Map();
  const all = [...manifest.assets, ...manifest.hands, ...manifest.shoes];
  for (const asset of all) {
    if (ids.has(asset.id)) issues.push({ level: "error", path: asset.id, message: "Duplicate id." }); ids.add(asset.id);
    const absolute = join(packRoot, asset.path);
    let data; try { data = await readFile(absolute); } catch { issues.push({ level: "error", path: asset.path, message: "File is missing." }); continue; }
    const digest = sha(data); if (asset.sha256 && digest !== asset.sha256) issues.push({ level: "error", path: asset.path, message: "SHA-256 does not match manifest." });
    const prior = hashes.get(digest); if (prior && !mirrorPair(prior, asset.id)) issues.push({ level: "warning", path: asset.path, message: `Duplicates ${prior}.` }); else hashes.set(digest, asset.id);
    if (asset.format === "png") { const png = inspectPng(data); if (!png.hasTransparentPixel) issues.push({ level: "error", path: asset.path, message: "PNG does not contain true alpha transparency." }); if (!png.hasVisiblePixel) issues.push({ level: asset.slot === "face.shading" ? "warning" : "error", path: asset.path, message: asset.slot === "face.shading" ? "Optional shading layer is empty." : "PNG is empty." }); if (png.width !== asset.width || png.height !== asset.height) issues.push({ level: "error", path: asset.path, message: "PNG dimensions differ from manifest." }); }
    if (asset.format === "svg" && !/<(?:[\w-]+:)?svg[\s>][\s\S]*viewBox=/i.test(data.toString("utf8"))) issues.push({ level: "error", path: asset.path, message: "SVG is missing a viewBox." });
  }
  for (const expression of manifest.expressions) for (const key of ["leftEye","rightEye","leftEyebrow","rightEyebrow","silentMouth","shading"]) if (!ids.has(expression[key])) issues.push({ level: "error", path: expression.id, message: `Missing ${key} link.` });
  return issues;
}

async function pngAsset(path, id, slot, handedness, tags) {
  const data = await readFile(path), png = inspectPng(data);
  if (!png.hasTransparentPixel || (!png.hasVisiblePixel && slot !== "face.shading")) throw new Error(`${basename(path)} must contain transparency and non-shading assets must contain visible pixels.`);
  return { id, path: relative(packRoot, path).replaceAll("\\", "/"), format: "png", slot, view: "front", width: png.width, height: png.height, anchor: { x: png.width / 2, y: png.height / 2 }, bounds: png.bounds, tags, handedness, mirrorSafe: false, sha256: sha(data) };
}

function svgAsset(path, id, slot, handedness, anchor, tags, extra = {}, width = 160, height = 160) { return { id, path: relative(packRoot, path).replaceAll("\\", "/"), format: "svg", slot, view: "front", width, height, anchor, bounds: { x: 8, y: 8, width: width - 16, height: height - 16 }, tags, handedness, mirrorSafe: false, sha256: "", ...extra }; }
function sha(data) { return createHash("sha256").update(data).digest("hex"); }
function title(slug) { return slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "); }
function mirrorPair(a, b) { return a.replace(/\.(left|right)$/, ".side") === b.replace(/\.(left|right)$/, ".side"); }

function inspectPng(data) {
  if (data.toString("ascii", 1, 4) !== "PNG") throw new Error("Invalid PNG signature.");
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20), bitDepth = data[24], colorType = data[25], interlace = data[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) throw new Error("PNG must be non-interlaced 8-bit RGBA.");
  const chunks = []; let offset = 8;
  while (offset < data.length) { const length = data.readUInt32BE(offset), type = data.toString("ascii", offset + 4, offset + 8); if (type === "IDAT") chunks.push(data.subarray(offset + 8, offset + 8 + length)); offset += 12 + length; if (type === "IEND") break; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, prior = Buffer.alloc(stride), row = Buffer.alloc(stride);
  let cursor = 0, minX = width, minY = height, maxX = -1, maxY = -1, hasTransparentPixel = false, hasVisiblePixel = false;
  for (let y = 0; y < height; y++) { const filter = raw[cursor++]; for (let x = 0; x < stride; x++) { const value = raw[cursor++], left = x >= 4 ? row[x - 4] : 0, up = prior[x], upperLeft = x >= 4 ? prior[x - 4] : 0; row[x] = (value + predictor(filter, left, up, upperLeft)) & 255; } for (let x = 0; x < width; x++) { const alpha = row[x * 4 + 3]; if (alpha < 255) hasTransparentPixel = true; if (alpha > 0) { hasVisiblePixel = true; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); } } row.copy(prior); }
  return { width, height, hasTransparentPixel, hasVisiblePixel, bounds: maxX < 0 ? { x: 0, y: 0, width: 0, height: 0 } : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
}
function predictor(filter, left, up, upperLeft) { if (filter === 0) return 0; if (filter === 1) return left; if (filter === 2) return up; if (filter === 3) return Math.floor((left + up) / 2); if (filter === 4) { const p = left + up - upperLeft, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upperLeft); return pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft; } throw new Error(`Unsupported PNG filter ${filter}.`); }

function handSvg(pose, side) {
  const configs = {
    relaxed:[[80,68,112,54],[91,73,122,65],[98,82,126,80]], fist:[], point:[[83,67,139,51]], "palm-up":[[78,66,109,43],[90,70,122,52],[98,79,130,66]], "palm-out":[[58,65,50,19],[72,61,69,12],[86,62,89,17],[99,68,110,30]], "thumbs-up":[[53,76,45,28]], "chin-touch":[[76,65,82,23],[90,69,100,33]], facepalm:[[56,67,49,18],[71,61,68,10],[86,62,88,15],[100,69,109,28]], "count-one":[[72,63,70,13]], "count-two":[[69,63,65,13],[85,63,89,15]], "count-three":[[62,67,53,21],[77,61,75,12],[92,65,100,20]], "phone-grip":[[60,69,43,45],[95,83,116,61]], "object-grip":[[76,67,99,43],[91,73,113,55]], "controller-grip":[[69,70,47,53],[95,77,117,61]], "hands-on-hips":[[57,76,42,61]], "panic-claw":[[57,70,38,38],[70,62,61,27],[84,62,88,25],[98,68,115,38]],
  };
  const fingers = configs[pose] ?? configs.relaxed, mirror = side === "right" ? ' transform="translate(160 0) scale(-1 1)"' : "";
  const fingerSvg = fingers.map(([x1,y1,x2,y2]) => `<path d="M${x1} ${y1} Q${(x1+x2)/2} ${Math.min(y1,y2)-5} ${x2} ${y2}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${side} ${pose} hand"><g${mirror}><g fill="none" stroke="#111318" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">${fingerSvg}</g><g fill="none" stroke="#ffdbab" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${fingerSvg}</g><path d="M18 77 Q31 68 49 70 C54 57 72 51 89 58 C106 65 113 83 107 101 C101 119 84 129 65 124 L45 117 Q31 111 18 101 Z" fill="#ffdbab" stroke="#111318" stroke-width="5" stroke-linejoin="round"/><path d="M20 92 Q38 88 49 96" fill="none" stroke="#e9c89c" stroke-width="5" stroke-linecap="round"/><path d="M64 116 Q84 117 99 103" fill="none" stroke="#e9c89c" stroke-width="4" stroke-linecap="round"/></g></svg>\n`;
}

function shoeSvg(side) { const mirror = side === "right" ? ' transform="translate(220 0) scale(-1 1)"' : ""; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" role="img" aria-label="${side} oversized sneaker"><g${mirror}><path d="M55 19 H98 L112 69 Q150 72 184 89 Q202 98 198 116 H29 Q18 101 32 88 L55 70 Z" fill="#f5f7fa" stroke="#111318" stroke-width="7" stroke-linejoin="round"/><path d="M63 22 H94 L105 72 H53 Z" fill="#e70000" stroke="#111318" stroke-width="6"/><path d="M30 105 H199 Q204 117 194 125 H38 Q28 122 30 105 Z" fill="#dce2e8" stroke="#111318" stroke-width="6"/><path d="M108 75 L146 92 M101 85 L133 100" stroke="#111318" stroke-width="5" stroke-linecap="round"/><path d="M46 112 H177" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/></g></svg>\n`; }
function jointSvg(joint) { const size = joint === "knee" ? 62 : joint === "elbow" ? 54 : 46; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${joint} overlap cap"><ellipse cx="48" cy="48" rx="${size/2}" ry="${size*.42}" fill="${joint === "knee" || joint === "ankle" ? "#000a88" : "#e70000"}" stroke="#111318" stroke-width="5"/><path d="M${48-size*.28} 56 Q48 66 ${48+size*.28} 56" fill="none" stroke="${joint === "knee" || joint === "ankle" ? "#000066" : "#c70600"}" stroke-width="5" stroke-linecap="round"/></svg>\n`; }
