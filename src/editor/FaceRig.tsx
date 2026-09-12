import { eyeExpressions, mouthPackBase, productionViseme, productionVisemes } from "../character/FaceAssets";
import { browPresets, expressionForSide, eyeDesigns } from "../character/EyePresets";
import { faceFxUrl, rasterBrowUrl, rasterEyes, rasterEyeUrl } from "../character/RasterFaceAssets";
import { isModularExpressionSlug, modularExpressionFor, modularExpressionUrl } from "../character/ModularExpressionAssets";
import type { BrowPreset, CryControls, CryState, EyeExpression, EyeSideState, FaceAssetState, FaceCalibration, FaceState, ProductionViseme } from "../project/schema";

interface Props { face: FaceState; calibration: FaceCalibration; assets?: FaceAssetState; time: number; playing: boolean; headMotion?: { rotation: number; x: number; y: number }; resolveAssetUrl?(url: string): string }
interface ClassicPreset { folder: string; eye: [number, number]; eyeY?: number; openness?: number }
const classicPresets: Record<string, ClassicPreset> = {
  neutral: { folder: "normal-eyes-2", eye: [18, 34] }, soft: { folder: "normal-eyes-2", eye: [18, 32], openness: .92 }, sad: { folder: "sad-eyes", eye: [18, 34], openness: .92 }, cunning: { folder: "cunning-eyes", eye: [30, 13], openness: .82 }, serious: { folder: "serious-eyes", eye: [30, 18], openness: .86 }, curious: { folder: "curious-eyes-middle", eye: [16, 31] }, angry: { folder: "angry-eyes", eye: [25, 27], openness: .9 }, shock: { folder: "shock-eyes", eye: [14, 14], openness: 1.18 }, suspicious: { folder: "cunning-eyes", eye: [30, 13], openness: .76 }, tired: { folder: "serious-eyes", eye: [30, 18], openness: .68 }, concerned: { folder: "sad-eyes", eye: [18, 34], openness: .86 }, closed: { folder: "closed-eyes", eye: [30, 5], eyeY: 178, openness: .12 },
};
const partUrl = (folder: string, part: string) => `/production_character/illustrator2024/eyes/${folder}/${part}`;
const identity = (url: string) => url;
export const eyeCenters = { left: 858, right: 930 } as const;
export const tearOrigins = { left: [858, 195], right: [930, 195] } as const;
export const cryLoopSeconds = 2;
const defaultCryControls: CryControls = { state: "auto", enableShake: true, enableTears: true, shakeAmount: 1.6, shakeFrequency: 12, shakeVerticalRatio: .55, shakeRotation: .18, flowSpeed: 24, turbulenceAmount: 2.2, turbulenceSize: 24, opacity: .92, amount: 1, showFaceMatte: false };

export function resolveFacePreview(face: FaceState, time: number, playing: boolean) {
  const demo = face.previewAutomation && playing;
  return { mouth: demo ? productionVisemes[Math.floor(time * 7) % productionVisemes.length] : productionViseme(face.mouth), blink: Math.max(face.blink, demo && time % 3.7 < .13 ? 1 : 0), gazeX: clamp(face.gazeX + (demo ? Math.sin(time * 1.3) * .45 : 0), -1, 1), gazeY: clamp(face.gazeY + (demo ? Math.sin(time * .7) * .35 : 0), -1, 1) };
}
export function canonicalExpression(value: EyeExpression): EyeExpression { if (value.startsWith("curious")) return "curious"; if (value === "lookLeft" || value === "lookRight") return "neutral"; return value; }

export function FaceRig({ face, calibration, assets, time, playing, headMotion = { rotation: 0, x: 0, y: 0 }, resolveAssetUrl = identity }: Props) {
  const cryId=useId().replace(/:/g,"");
  const assetState = assets ?? { activeMouthPack: "v3", activeEyePack: "raster-v1", mouthOverrides: {}, eyeOverrides: {}, browOverrides: {} };
  const selectedModularExpression = isModularExpressionSlug(assetState.modularExpressionV2) ? assetState.modularExpressionV2 : undefined;
  const modularSlugFor = (expression: EyeExpression) => expression === "blink" ? modularExpressionFor(expression) : selectedModularExpression ?? modularExpressionFor(expression);
  const preview = resolveFacePreview(face, time, playing), baseExpression = canonicalExpression(face.eyeExpression);
  const gazeX = preview.gazeX * calibration.gazeRangeX, gazeY = preview.gazeY * calibration.gazeRangeY;
  const parallax = calibration.parallaxStrength ?? .45, featureX = (-headMotion.rotation * .15 + headMotion.x * .04) * parallax, featureY = (Math.abs(headMotion.rotation) * .025 + headMotion.y * .04) * parallax;
  const eyeSystem = face.eyeSystem ?? fallbackEyeSystem(), browSystem = face.browSystem ?? fallbackBrowSystem();
  const activeExpression = (side: "left" | "right") => expressionForSide(eyeSystem[side].expression === "inherit" ? baseExpression : eyeSystem[side].expression, side);
  const selectedExpressions = [activeExpression("left"), activeExpression("right")];
  const autoShadowRage = baseExpression === "shadowRage" || selectedExpressions.every((value) => value === "shadowRage");
  const shadowRage = assetState.activeEyePack !== "modular-v2" && (face.faceFx === "angryShadow" || (face.faceFx === "auto" && autoShadowRage));
  const cryControls = { ...defaultCryControls, ...face.cryControls };
  const automaticCryState: CryState = selectedExpressions.includes("sobCrying") ? "cryingHard" : selectedExpressions.some((value) => value === "crying") ? "cryStream" : selectedExpressions.some((value) => value === "teary") ? "watery" : "off";
  const cryState: CryState = face.tears === "waterfall" ? "waterfallExtreme" : face.tears === "stream" ? "cryStream" : face.tears === "none" ? "off" : cryControls.state === "auto" ? automaticCryState : cryControls.state;
  const shake = cryShakeOffset(time, cryControls, cryState === "aboutToCry" || cryState === "watery");
  const eyeShakeTransform = `translate(${shake.x} ${shake.y}) rotate(${shake.rotation} 894 176)`;
  const extraFx = face.extraFaceFx === "auto" ? (shadowRage ? "angerCross01" : "none") : face.extraFaceFx;
  const renderSide = (side: "left" | "right") => {
    if (shadowRage) return null;
    const state = eyeSystem[side], expression = preview.blink > .72 ? "blink" : activeExpression(side);
    const centerX = eyeCenters[side], part = face.parts[side === "left" ? "eyeL" : "eyeR"], override = assetState.eyeOverrides?.[expression]?.[side]?.dataUrl;
    if (override) return <image key={side} href={resolveAssetUrl(override)} x={centerX - 17 + part.x} y={156 + part.y} width={34 * part.scaleX * state.scaleX} height={40 * part.scaleY * state.scaleY} />;
    if (assetState.activeEyePack === "modular-v2") { const slug = modularSlugFor(expression), size = 64 * calibration.eyeVisualScale, anatomicalPart = side === "left" ? "right-eye" : "left-eye"; return <image key={side} data-eye-root={side} data-expression-v2={slug} href={resolveAssetUrl(modularExpressionUrl(slug, anatomicalPart))} x={centerX + part.x + featureX - size * part.scaleX * state.scaleX / 2} y={176 + part.y + featureY - size * part.scaleY * state.scaleY / 2} width={size * part.scaleX * state.scaleX} height={size * part.scaleY * state.scaleY} opacity={state.openness <= .02 ? 0 : 1} transform={`rotate(${state.rotation + (part.rotation ?? 0)} ${centerX + part.x + featureX} ${176 + part.y + featureY})`}/>; }
    const raster = rasterEyes[expression];
    if (raster && assetState.activeEyePack !== "classic") { const width = raster.width * part.scaleX * state.scaleX * calibration.eyeVisualScale, height = raster.height * part.scaleY * state.scaleY * calibration.eyeVisualScale; return <image key={side} data-eye-root={side} href={resolveAssetUrl(rasterEyeUrl(raster.key, side))} x={centerX + part.x + featureX - width / 2} y={176 + part.y + featureY - height / 2} width={width} height={height} opacity={state.openness <= .02 ? 0 : 1} transform={`rotate(${state.rotation + (part.rotation ?? 0)} ${centerX + part.x + featureX} ${176 + part.y + featureY})`}/>; }
    if (assetState.activeEyePack === "classic") return renderClassicEye(side, expression, centerX, part, state, preview.blink, gazeX, gazeY, resolveAssetUrl);
    return <ProceduralEye key={side} side={side} expression={expression} state={state} centerX={centerX + part.x + featureX} centerY={176 + part.y + featureY} scaleX={part.scaleX * calibration.eyeVisualScale} scaleY={part.scaleY * calibration.eyeVisualScale * (face.eyeOpenness ?? 1)} gazeX={gazeX} gazeY={gazeY} />;
  };
  const renderBrow = (side: "left" | "right") => {
    if (shadowRage) return null;
    const expression = activeExpression(side), design = eyeDesigns[expression] ?? eyeDesigns.neutral;
    const state = browSystem[side], preset = state.preset === "auto" ? design.brow : state.preset, part = face.parts[side === "left" ? "browL" : "browR"], centerX = eyeCenters[side];
    const override = assetState.browOverrides?.[preset]?.[side]?.dataUrl;
    if (override) return <image key={`brow-${side}`} href={resolveAssetUrl(override)} x={centerX - 18 + state.x + part.x} y={140 + state.y + part.y} width={36 * state.scaleX * part.scaleX} height={18 * state.scaleY * part.scaleY} />;
    if (assetState.activeEyePack === "modular-v2" && state.preset === "auto") { const slug = modularSlugFor(expression), size = 64, anatomicalPart = side === "left" ? "right-eyebrow" : "left-eyebrow"; return <image key={`brow-${side}`} data-brow-root={side} data-expression-v2={slug} href={resolveAssetUrl(modularExpressionUrl(slug, anatomicalPart))} x={centerX + state.x + part.x + featureX * .8 - size * state.scaleX * part.scaleX / 2} y={151 + state.y + part.y + featureY * .8 - size * state.scaleY * part.scaleY / 2} width={size * state.scaleX * part.scaleX} height={size * state.scaleY * part.scaleY} transform={`rotate(${state.rotation + (part.rotation ?? 0)} ${centerX + state.x + part.x + featureX * .8} ${151 + state.y + part.y + featureY * .8})`}/>; }
    const raster = state.preset === "auto" ? rasterEyes[expression] : undefined;
    if (raster && assetState.activeEyePack !== "classic") { const width = raster.browWidth * state.scaleX * part.scaleX, height = raster.browHeight * state.scaleY * part.scaleY; return <image key={`brow-${side}`} data-brow-root={side} href={resolveAssetUrl(rasterBrowUrl(raster.key, side))} x={centerX + state.x + part.x + featureX * .8 - width / 2} y={151 + state.y + part.y + featureY * .8 - height / 2} width={width} height={height} transform={`rotate(${state.rotation + (part.rotation ?? 0)} ${centerX + state.x + part.x + featureX * .8} ${151 + state.y + part.y + featureY * .8})`}/>; }
    return <ProceduralBrow key={`brow-${side}`} side={side} preset={preset} state={state} x={centerX + state.x + part.x + featureX * .8} y={154 + state.y + part.y + featureY * .8} scaleX={state.scaleX * part.scaleX} scaleY={state.scaleY * part.scaleY} rotation={state.rotation + (part.rotation ?? 0)} />;
  };
  const mouthTransform = face.mouthParts?.[preview.mouth] ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, mouthScale: Partial<Record<ProductionViseme, number>> = { REST: .88, MBP: .92, FV: .96, R: .94, AA: 1.08, AEE: 1.02, EEI: 1.04, UH: .92, OOW: .88 };
  const continuousWidth = 1 + (face.mouthWidth ?? 0) * .16 - (face.lipRound ?? 0) * .14, continuousHeight = 1 + (face.jawOpen ?? 0) * .34 + (face.lipRound ?? 0) * .12 - (face.lipPress ?? 0) * .14, intensity = .94 + (face.mouthIntensity ?? 0) * .08;
  const width = 52 * calibration.mouthVisualScale * (mouthScale[preview.mouth] ?? 1) * mouthTransform.scaleX * continuousWidth * intensity, height = 26 * calibration.mouthVisualScale * (mouthScale[preview.mouth] ?? 1) * mouthTransform.scaleY * continuousHeight * intensity;
  const mouthX = 893 + mouthTransform.x + (face.mouthOffsetX ?? 0) + featureX * .55, mouthY = 222 + mouthTransform.y + (face.mouthOffsetY ?? 0) + featureY * .45 + Math.max(0, height - 26 * calibration.mouthVisualScale) * .2;
  const modularSlug = modularSlugFor(baseExpression), useSilentExpressionMouth = assetState.activeEyePack === "modular-v2" && preview.mouth === "REST";
  const showModularShading = assetState.activeEyePack === "modular-v2" && modularSlug !== "sad-teary" && modularSlug !== "crying-breakdown";
  const mouthHref = useSilentExpressionMouth ? modularExpressionUrl(modularSlug, "mouth") : shadowRage && preview.mouth === "REST" ? "/production_character/illustrator2024/mouths/frown.svg" : assetState.mouthOverrides[preview.mouth]?.dataUrl ?? `${mouthPackBase}/${preview.mouth}.svg`, glasses = face.accessories?.sunglasses;
  const renderedMouthWidth = useSilentExpressionMouth ? 70 * mouthTransform.scaleX : width, renderedMouthHeight = useSilentExpressionMouth ? 70 * mouthTransform.scaleY : height;
  return <g className="face-rig" pointerEvents="none">
    <defs><linearGradient id="eyeSparkle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2d3540"/><stop offset="1" stopColor="#080a0d"/></linearGradient><clipPath id={`expression-face-${cryId}`}><path d={faceInteriorPath}/></clipPath></defs>
    {showModularShading && <image data-face-effect="expression-shading-v2" href={resolveAssetUrl(modularExpressionUrl(modularSlug, "face-shading"))} x="824" y="118" width="140" height="140" opacity=".72" clipPath={`url(#expression-face-${cryId})`}/>}
    {shadowRage && <ShadowRage resolveAssetUrl={resolveAssetUrl}/>} {extraFx !== "none" && <AngerMark kind={extraFx} resolveAssetUrl={resolveAssetUrl}/>}<g data-cry-eyes-null="CRY_EYES_NULL" transform={eyeShakeTransform}>{renderBrow("left")}{renderBrow("right")}{renderSide("left")}{renderSide("right")}</g>
    {cryControls.enableTears && <FaceContainedTears idPrefix={cryId} state={cryState} time={time} controls={cryControls}/>} 
    <g transform={`rotate(${(face.mouthRotation ?? 0) + (mouthTransform.rotation ?? 0)} ${mouthX} ${mouthY})`}><image data-face-part="mouth" href={resolveAssetUrl(mouthHref)} x={mouthX - renderedMouthWidth / 2} y={mouthY - renderedMouthHeight / 2} width={renderedMouthWidth} height={renderedMouthHeight} /></g>
    {glasses?.visible && <image data-face-accessory="sunglasses" href={resolveAssetUrl("/production_character/illustrator2024/face/accessories/black-sunglasses.svg")} x={824 + glasses.offsetX} y={139 + glasses.offsetY} width={140 * glasses.scale} height={64 * glasses.scale} opacity={glasses.opacity} transform={`rotate(${glasses.rotation} ${894 + glasses.offsetX} ${171 + glasses.offsetY})`} />}
    <g className="face-debug">{calibration.showEyeCenters && <><circle cx={eyeCenters.left + gazeX} cy={176 + gazeY} r="2"/><circle cx={eyeCenters.right + gazeX} cy={176 + gazeY} r="2"/></>}</g>
  </g>;
}

function ProceduralEye({ side, expression, state, centerX, centerY, scaleX, scaleY, gazeX, gazeY }: { side: "left" | "right"; expression: EyeExpression; state: EyeSideState; centerX: number; centerY: number; scaleX: number; scaleY: number; gazeX: number; gazeY: number }) {
  const design = eyeDesigns[expression] ?? eyeDesigns.neutral, mirror = side === "left" ? 1 : -1, open = clamp(design.openness * state.openness * (1 - state.squint * .55), .04, 1.45), sx = design.scaleX * state.scaleX * scaleX, sy = design.scaleY * state.scaleY * scaleY, rotation = design.rotation * mirror + state.rotation, pupilScale = design.pupilScale * state.pupilScale, px = gazeX + state.pupilX, py = gazeY + state.pupilY;
  if (expression === "angrySqueezed") return <g data-eye-root={side} transform={`translate(${centerX} ${centerY}) scale(${sx} ${sy})`}><path d={side === "left" ? "M -16 -7 L 2 0 L -15 7" : "M 16 -7 L -2 0 L 15 7"} fill="none" stroke="#111318" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>;
  if (expression === "sobCrying") return <g data-eye-root={side} transform={`translate(${centerX} ${centerY}) scale(${sx} ${sy})`}><path d="M -16 -3 Q -8 -7 0 -3 T 16 -3 M -15 1 Q -7 -3 1 1 T 15 1" fill="none" stroke="#111318" strokeWidth="2.8" strokeLinecap="round"/></g>;
  if (design.style === "closed" || open < .12) { const lift = design.squint < 0 ? 5 : -2; return <g data-eye-root={side} transform={`translate(${centerX} ${centerY}) rotate(${rotation}) scale(${sx} ${sy})`}><path d={`M -15 0 Q 0 ${lift + design.squint * 5} 15 0`} fill="none" stroke="#111318" strokeWidth="2.8" strokeLinecap="round"/></g>; }
  if (design.style === "simple") return <g data-eye-root={side} transform={`translate(${centerX + px} ${centerY + py}) rotate(${rotation}) scale(${sx} ${sy * open})`}><ellipse rx="7.3" ry="15" fill="#080a0d"/></g>;
  const width = design.style === "anime" || design.style === "sparkle" ? 18 : 17.5, height = 18 * open, selectedHighlight = state.highlightStyle === "auto" ? design.highlight : state.highlightStyle, highlight = selectedHighlight === "none" && design.style === "white" ? "single" : selectedHighlight, pupilX = clamp(px * 1.6, -width * .5, width * .5), pupilY = clamp(py * 1.6, -height * .45, height * .45), angry = ["angry", "veryAngry", "rage", "disgusted", "animeDetermined"].includes(expression);
  return <g data-eye-root={side} transform={`translate(${centerX} ${centerY}) rotate(${rotation}) scale(${sx} ${sy})`}>
    {angry ? <path d={side === "left" ? `M -${width} -3 Q -2 ${-height - 3} ${width} 2 Q ${width - 1} ${height * .72} 0 ${height} Q -${width + 1} ${height * .7} -${width} -3 Z` : `M -${width} 2 Q 2 ${-height - 3} ${width} -3 Q ${width + 1} ${height * .7} 0 ${height} Q -${width - 1} ${height * .72} -${width} 2 Z`} fill="#fff" stroke="#111318" strokeWidth="2.7" strokeLinejoin="round"/> : design.style === "anime" ? <path d={`M -${width} 3 Q 0 ${-height - 5} ${width} -2 Q ${width - 2} ${height} 0 ${height} Q -${width + 1} ${height - 1} -${width} 3 Z`} fill="#fff" stroke="#111318" strokeWidth="2.4"/> : <path d={`M -${width} 1 C -${width - 1} ${-height * .62}, -${width * .54} ${-height}, 0 ${-height * .96} C ${width * .54} ${-height}, ${width - 1} ${-height * .58}, ${width} 1 C ${width - 1} ${height * .62}, ${width * .52} ${height}, 0 ${height * .95} C -${width * .55} ${height}, -${width - 1} ${height * .58}, -${width} 1 Z`} fill="#fff" stroke="#111318" strokeWidth="2.5" strokeLinejoin="round"/>}
    <ellipse cx={pupilX} cy={pupilY} rx={6.2 * pupilScale} ry={8.6 * pupilScale} fill={design.style === "sparkle" ? "url(#eyeSparkle)" : "#080a0d"}/>
    {highlight !== "none" && <><circle cx={pupilX - 2} cy={pupilY - 4} r={2.2 * pupilScale} fill="#fff"/>{(highlight === "double" || highlight === "sparkle") && <circle cx={pupilX + 3} cy={pupilY + 2} r={1.2 * pupilScale} fill="#fff"/>}</>}
    {(expression === "teary" || expression === "crying") && <path d={`M ${side === "left" ? -12 : 12} 13 q ${side === "left" ? -3 : 3} 8 0 13 q ${side === "left" ? 7 : -7} -5 0 -13`} fill="#88d9ff" opacity=".82"/>}
  </g>;
}

function ShadowRage({ resolveAssetUrl }: { resolveAssetUrl(url: string): string }) { return <image data-face-effect="shadow-rage" href={resolveAssetUrl(faceFxUrl("angry_shadow"))} x="824" y="135" width="140" height="61" preserveAspectRatio="none"/>; }
function AngerMark({ kind, resolveAssetUrl }: { kind: "angerCross01" | "angerCross02" | "angerVein01"; resolveAssetUrl(url: string): string }) { const file = kind === "angerCross02" ? "anger_cross_02" : kind === "angerVein01" ? "anger_vein_01" : "anger_cross_01"; return <image data-face-effect="anger-mark" href={resolveAssetUrl(faceFxUrl(file))} x="941" y="145" width="22" height="22"/>; }
export const tearFlowOffset = (time: number, speed = 24, tileHeight = 48) => ((time * speed) % tileHeight + tileHeight) % tileHeight;
export function cryShakeOffset(time: number, controls: CryControls, active = true) { if (!active || !controls.enableShake) return { x: 0, y: 0, rotation: 0 }; const phase=time*Math.PI*2*controls.shakeFrequency; return { x: Math.sin(phase)*controls.shakeAmount, y: Math.sin(phase+1.7)*controls.shakeAmount*controls.shakeVerticalRatio, rotation: Math.sin(phase+.8)*controls.shakeRotation }; }
export function outsideAlphaPixelCount(tearAlpha: ArrayLike<number>, faceAlpha: ArrayLike<number>, threshold = 8) { let count=0; for(let index=0;index<Math.min(tearAlpha.length,faceAlpha.length);index++) if(tearAlpha[index]>threshold&&faceAlpha[index]<=threshold) count++; return count; }

const faceInteriorPath = "M 826 145 C 828 126 846 112 868 108 L 930 108 C 950 112 960 129 961 151 L 961 193 C 960 221 944 242 922 249 C 904 255 882 252 866 245 C 841 234 827 216 826 193 Z";
const tearPaths = {
  left: "M 855 194 C 850 201 856 207 851 214 C 846 221 853 228 850 235 C 847 242 857 248 865 253 C 869 256 873 252 870 247 C 866 240 860 236 863 229 C 867 221 859 215 864 207 C 867 201 862 195 861 194 C 859 193 857 193 855 194 Z",
  right: "M 933 194 C 938 201 932 207 937 214 C 942 221 935 228 938 235 C 941 242 931 248 923 253 C 919 256 915 252 918 247 C 922 240 928 236 925 229 C 921 221 929 215 924 207 C 921 201 926 195 927 194 C 929 193 931 193 933 194 Z",
} as const;
function FaceContainedTears({ idPrefix, state, time, controls }: { idPrefix: string; state: CryState; time: number; controls: CryControls }) {
  const enabled=["firstTear","cryStream","cryingHard","waterfallExtreme"].includes(state); if(!enabled&&!controls.showFaceMatte)return null;
  const amount=state==="firstTear"?.36:state==="cryingHard"?1.14:state==="waterfallExtreme"?1.28:controls.amount;
  const offset=tearFlowOffset(time,controls.flowSpeed), loopPhase=Math.sin(time*Math.PI*2/cryLoopSeconds);
  const filterScale=controls.turbulenceAmount*(1+loopPhase*.12), frequency=Math.max(.012,1/controls.turbulenceSize);
  const suffix=`${idPrefix}-${state}-${Math.round(controls.amount*100)}`;
  return <g data-face-effect="anime-tears" data-cry-state={state} opacity={controls.opacity}>
    <defs>
      <clipPath id={`face-interior-${suffix}`}><path d={faceInteriorPath}/></clipPath>
      {(["left","right"] as const).map(side=>{const center=eyeCenters[side];return <clipPath key={side} id={`tear-boundary-${side}-${suffix}`}><path d={tearPaths[side]} transform={`translate(${center} 0) scale(${amount} 1) translate(${-center} 0)`}/></clipPath>})}
      <pattern id={`water-flow-${suffix}`} patternUnits="userSpaceOnUse" width="18" height="48" patternTransform={`translate(0 ${offset})`}><rect width="18" height="48" fill="#69d4f5"/><path d="M 3 -5 Q 13 2 5 10 T 7 25 T 4 53" fill="none" stroke="#2ebbe7" strokeWidth="4" strokeLinecap="round"/><path d="M 15 -3 Q 7 7 14 16 T 12 34 T 15 51" fill="none" stroke="#9ae6f9" strokeWidth="3" strokeLinecap="round"/></pattern>
      <filter id={`water-turbulence-${suffix}`} x="-20%" y="-10%" width="140%" height="120%"><feTurbulence type="fractalNoise" baseFrequency={`${frequency*.55} ${frequency*1.8}`} numOctaves="1" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale={filterScale} xChannelSelector="R" yChannelSelector="G"/></filter>
    </defs>
    <g clipPath={`url(#face-interior-${suffix})`} data-face-matte="FACE_INTERIOR_MATTE">
      {(["left","right"] as const).map(side=><g key={side} clipPath={`url(#tear-boundary-${side}-${suffix})`} data-tear-boundary={side}><rect x={side==="left"?842:900} y={state==="firstTear"?193:190} width="46" height={state==="firstTear"?24:66} fill={`url(#water-flow-${suffix})`} filter={`url(#water-turbulence-${suffix})`}/></g>)}
    </g>
    {controls.showFaceMatte&&<g className="face-debug" data-cry-debug="true"><path d={faceInteriorPath} fill="#32e875" fillOpacity=".18" stroke="#32e875"/><path d={tearPaths.left} fill="#21a9ff" fillOpacity=".45"/><path d={tearPaths.right} fill="#21a9ff" fillOpacity=".45"/><circle cx={tearOrigins.left[0]} cy={tearOrigins.left[1]} r="2.5"/><circle cx={tearOrigins.right[0]} cy={tearOrigins.right[1]} r="2.5"/><path d="M 860 248 Q 895 257 930 248" stroke="#ffdc55"/><text x="895" y="266">CHIN TERMINATION</text></g>}
  </g>;
}

const browShape: Record<Exclude<BrowPreset, "auto">, { inner: number; outer: number; bend: number; y: number }> = {
  neutral:{inner:0,outer:0,bend:-3,y:0},soft:{inner:-1,outer:0,bend:-4,y:1},raised:{inner:-4,outer:-4,bend:-5,y:-2},veryRaised:{inner:-8,outer:-8,bend:-6,y:-5},innerRaised:{inner:-7,outer:1,bend:-4,y:-1},outerRaised:{inner:1,outer:-7,bend:-4,y:-1},sad:{inner:-6,outer:3,bend:-2,y:1},concerned:{inner:-7,outer:2,bend:-3,y:0},worried:{inner:-8,outer:1,bend:-4,y:-1},curious:{inner:-3,outer:-6,bend:-5,y:-1},suspicious:{inner:3,outer:-2,bend:-1,y:2},cunning:{inner:2,outer:-4,bend:-1,y:1},angry:{inner:5,outer:-5,bend:0,y:1},veryAngry:{inner:8,outer:-7,bend:1,y:2},serious:{inner:3,outer:-3,bend:-1,y:1},determined:{inner:5,outer:-5,bend:0,y:0},excited:{inner:-5,outer:-5,bend:-6,y:-3},animeAngry:{inner:9,outer:-8,bend:1,y:1},
};
function ProceduralBrow({ side, preset, state, x, y, scaleX, scaleY, rotation }: { side: "left" | "right"; preset: Exclude<BrowPreset, "auto">; state: FaceState["browSystem"]["left"]; x: number; y: number; scaleX: number; scaleY: number; rotation: number }) {
  const shape = browShape[preset], intensity = state.intensity, inner = shape.inner * intensity + state.innerHeight, outer = shape.outer * intensity + state.outerHeight, bend = shape.bend * intensity + state.curve, leftY = side === "left" ? outer : inner, rightY = side === "left" ? inner : outer;
  return <g data-brow-root={side} transform={`translate(${x} ${y + shape.y * intensity}) rotate(${rotation}) scale(${scaleX} ${scaleY})`}><path d={`M -17 ${leftY} C -8 ${leftY + bend}, 8 ${rightY + bend}, 17 ${rightY}`} fill="none" stroke="#111318" strokeWidth="3.2" strokeLinecap="round"/></g>;
}
function classicKey(expression: EyeExpression) { if (expression === "shocked" || expression === "extremeShock" || expression === "panic" || expression === "shock") return "shock"; if (expression === "closed" || expression === "blink" || expression.toLowerCase().includes("closed")) return "closed"; if (classicPresets[expression]) return expression; if (expression.toLowerCase().includes("angry") || expression === "rage") return "angry"; if (expression.toLowerCase().includes("sad") || expression === "worried") return "sad"; if (expression === "bored" || expression === "sleepy") return "tired"; return "neutral"; }
function renderClassicEye(side: "left" | "right", expression: EyeExpression, centerX: number, part: FaceState["parts"]["eyeL"], state: EyeSideState, blink: number, gazeX: number, gazeY: number, resolve: (url: string) => string) { const preset = classicPresets[blink > .72 ? "closed" : classicKey(expression)], width = preset.eye[0] * part.scaleX * state.scaleX, height = preset.eye[1] * part.scaleY * state.scaleY * (preset.openness ?? 1) * state.openness; return <image key={side} href={resolve(partUrl(preset.folder, side === "left" ? "eye-l.svg" : "eye-r.svg"))} x={centerX + part.x + gazeX - width / 2} y={(preset.eyeY ?? 176) + part.y + gazeY - height / 2} width={width} height={height}/>; }
function fallbackEyeSystem(): FaceState["eyeSystem"] { const value: EyeSideState = { expression: "inherit", scaleX: 1, scaleY: 1, openness: 1, squint: 0, rotation: 0, pupilScale: 1, pupilX: 0, pupilY: 0, highlightStyle: "auto" }; return { left: { ...value }, right: { ...value } }; }
function fallbackBrowSystem(): FaceState["browSystem"] { const value = { preset: "auto" as const, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, innerHeight: 0, outerHeight: 0, curve: 0, intensity: 1 }; return { left: { ...value }, right: { ...value } }; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
export { browPresets, eyeExpressions };
import { useId } from "react";
