import { eyeDesigns } from "../character/EyePresets";
import { rasterEyes } from "../character/RasterFaceAssets";
import { createDefaultProject } from "../project/project";
import type { ExtraFaceFxMode, EyeExpression } from "../project/schema";
import { FaceRig } from "./FaceRig";

const batch: Array<{ expression: EyeExpression; label: string; extraFaceFx?: ExtraFaceFxMode }> = [
  { expression: "angry", label: "Classic angry" },
  { expression: "angrySqueezed", label: "Extreme squint" },
  { expression: "coldGlare", label: "Narrow glare" },
  { expression: "annoyed", label: "Annoyed half-open" },
  { expression: "sparkleCute", label: "Cute sparkle" },
  { expression: "teary", label: "Watery / sad" },
  { expression: "crying", label: "Crying stream" },
  { expression: "sobCrying", label: "Crying waterfall" },
  { expression: "shadowRage", label: "Shadow + cross 01", extraFaceFx: "angerCross01" },
  { expression: "shadowRage", label: "Shadow + cross 02", extraFaceFx: "angerCross02" },
  { expression: "shadowRage", label: "Shadow + anger vein", extraFaceFx: "angerVein01" },
];

export function EyeContactSheet() {
  const project = createDefaultProject();
  return <main className="contact-sheet"><header><div><small>ALGOWZXD 2024 · GENERATED RASTER FACE V1</small><h1>First quality-batch composites</h1><p>Generated transparent PNG eyes, brows, tears, shadow, and anger marks composited on the unchanged canonical head.</p></div><button onClick={() => history.back()}>BACK</button></header><div className="contact-grid">{batch.map(({ expression, label, extraFaceFx }, index) => {
    const face = { ...project.character.face, eyeExpression: expression, extraFaceFx: extraFaceFx ?? "auto", previewAutomation: false };
    const raster = rasterEyes[expression];
    return <article key={`${expression}-${index}`}><svg viewBox="790 65 210 245"><g transform="matrix(.65 0 0 .65 221.95 -72.55)"><image href="/production_character/illustrator2024/head/head.svg" x="0" y="0" width="1920" height="1080"/><image href="/production_character/illustrator2024/head/ears.svg" x="0" y="0" width="1920" height="1080"/><image href="/production_character/illustrator2024/head/hair.svg" x="0" y="0" width="1920" height="1080"/></g><FaceRig face={face} calibration={project.character.calibration} assets={project.character.faceAssets!} time={.28} playing={false}/></svg><div><b>{label}</b><span>{raster ? `GENERATED PNG · ${raster.key}` : `FACE FX · T${eyeDesigns[expression].tier}`}</span></div></article>;
  })}</div></main>;
}
