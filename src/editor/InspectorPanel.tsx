import { useState } from "react";
import { descendantsOf } from "../rig/Skeleton";
import { eyeExpressions, productionVisemes } from "../character/FaceAssets";
import type { Bone, FaceAssetState, EyeExpression, FaceCalibration, FacePartName, FaceState, MouthShape } from "../project/schema";
import { FaceAssetManager } from "./FaceAssetManager";

interface Props {
  bone: Bone;
  bones: Bone[];
  onChange(patch: Partial<Bone>): void;
  face: FaceState;
  onFaceChange(patch: Partial<FaceState>): void;
  calibration: FaceCalibration;
  onCalibrationChange(patch: Partial<FaceCalibration>): void;
  onNeckPivot(patch: Pick<Bone, "pivotX" | "pivotY">): void;
  faceAssets: FaceAssetState;
  onFaceAssets(next: FaceAssetState): void;
  onOpenEyeLab(): void;
}

const NumberField = ({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange(value: number): void;
}) => (
  <label className="number-field">
    <span>{label}</span>
    <input
      type="number"
      value={Number(value.toFixed(3))}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

export function InspectorPanel({ bone, bones, onChange, face, onFaceChange, calibration, onCalibrationChange, onNeckPivot, faceAssets, onFaceAssets, onOpenEyeLab }: Props) {
  const [panel, setPanel] = useState<"rig" | "face" | "assets">("rig");
  const invalidParents = new Set([bone.id, ...descendantsOf(bones, bone.id).map((item) => item.id)]);

  return (
    <aside className="right-panel panel">
      <div className="panel-tabs">
        <button className={panel === "rig" ? "active" : ""} onClick={() => setPanel("rig")}>Inspector</button>
        <button className={panel === "face" ? "active" : ""} onClick={() => setPanel("face")}>Face</button>
        <button className={panel === "assets" ? "active" : ""} onClick={() => setPanel("assets")}>Assets</button>
      </div>
      {panel === "assets" ? <FaceAssetManager assets={faceAssets} face={face} onAssets={onFaceAssets} onFace={onFaceChange} /> : panel === "face" ? <FaceControls face={face} onChange={onFaceChange} calibration={calibration} onCalibrationChange={onCalibrationChange} neck={bones.find((item) => item.id === "neck")} onNeckPivot={onNeckPivot} onOpenEyeLab={onOpenEyeLab} /> : <>
      <div className="inspector-title">
        <span className="selection-glyph" />
        <div>
          <strong>{bone.name}</strong>
          <small>{bone.id}</small>
        </div>
      </div>

      <section className="inspector-section">
        <header>TRANSFORM</header>
        <div className="field-grid">
          <NumberField label="X" value={bone.x} onChange={(x) => onChange({ x })} />
          <NumberField label="Y" value={bone.y} onChange={(y) => onChange({ y })} />
          <NumberField label="Rotation" value={bone.rotation} onChange={(rotation) => onChange({ rotation })} />
          <span />
          <NumberField label="Scale X" value={bone.scaleX} step={0.01} onChange={(scaleX) => onChange({ scaleX })} />
          <NumberField label="Scale Y" value={bone.scaleY} step={0.01} onChange={(scaleY) => onChange({ scaleY })} />
        </div>
      </section>

      <section className="inspector-section">
        <header>PIVOT &amp; BONE</header>
        <div className="field-grid">
          <NumberField label="Pivot X" value={bone.pivotX} onChange={(pivotX) => onChange({ pivotX })} />
          <NumberField label="Pivot Y" value={bone.pivotY} onChange={(pivotY) => onChange({ pivotY })} />
          <NumberField label="Length" value={bone.length} onChange={(length) => onChange({ length })} />
          <NumberField label="Stiffness" value={bone.stiffness} step={0.05} onChange={(stiffness) => onChange({ stiffness })} />
        </div>
        <label className="select-field">
          <span>Parent</span>
          <select value={bone.parentId ?? ""} onChange={(event) => onChange({ parentId: event.target.value || null })}>
            <option value="">None</option>
            {bones.filter((item) => !invalidParents.has(item.id)).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="inspector-section">
        <header>CONSTRAINTS</header>
        <div className="field-grid">
          <NumberField label="Min°" value={bone.minRotation} onChange={(minRotation) => onChange({ minRotation })} />
          <NumberField label="Max°" value={bone.maxRotation} onChange={(maxRotation) => onChange({ maxRotation })} />
        </div>
      </section>

      <section className="inspector-section toggles">
        <label><input type="checkbox" checked={bone.visible} onChange={(event) => onChange({ visible: event.target.checked })} /> Visible</label>
        <label><input type="checkbox" checked={bone.locked} onChange={(event) => onChange({ locked: event.target.checked })} /> Locked</label>
      </section>

      <section className="binding-list">
        <header>ARTWORK BINDINGS</header>
        {bone.artworkPrefixes.length ? bone.artworkPrefixes.map((prefix) => <code key={prefix}>{prefix}*</code>) : <em>Logical bone — artwork missing</em>}
      </section>
      </>}
    </aside>
  );
}

function FaceControls({ face, onChange, calibration, onCalibrationChange, neck, onNeckPivot, onOpenEyeLab }: { face: FaceState; onChange(patch: Partial<FaceState>): void; calibration: FaceCalibration; onCalibrationChange(patch: Partial<FaceCalibration>): void; neck?: Bone; onNeckPivot(patch: Pick<Bone, "pivotX" | "pivotY">): void; onOpenEyeLab(): void }) {
  const partNames: Array<[FacePartName, string]> = [["eyeL", "Left eye"], ["eyeR", "Right eye"], ["browL", "Left eyebrow"], ["browR", "Right eyebrow"], ["highlightL", "Left white highlight"], ["highlightR", "Right white highlight"]];
  const changePart = (name: FacePartName, patch: Partial<FaceState["parts"][FacePartName]>) => onChange({ parts: { ...face.parts, [name]: { ...face.parts[name], ...patch } } });
  const mouthTransform = face.mouthParts?.[face.mouth] ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  const changeMouth = (patch: Partial<FaceState["mouthParts"][MouthShape]>) => onChange({ mouthParts: { ...face.mouthParts, [face.mouth]: { ...mouthTransform, ...patch } } });
  return <div className="face-controls">
    <div className="inspector-title"><span className="face-glyph">◉</span><div><strong>Face Controller</strong><small>Eyes · gaze · mouth</small></div></div>
    <section className="inspector-section"><button className="primary-action" style={{ width: "100%" }} onClick={onOpenEyeLab}>OPEN EYE DESIGN LAB</button></section>
    <section className="inspector-section">
      <header>GAZE CONTROL</header>
      <label className="range-field"><span>Horizontal</span><input type="range" min="-1" max="1" step="0.05" value={face.gazeX} onChange={(event) => onChange({ gazeX: Number(event.target.value) })} /><b>{face.gazeX.toFixed(2)}</b></label>
      <label className="range-field"><span>Vertical</span><input type="range" min="-1" max="1" step="0.05" value={face.gazeY} onChange={(event) => onChange({ gazeY: Number(event.target.value) })} /><b>{face.gazeY.toFixed(2)}</b></label>
      <label className="range-field"><span>Openness</span><input type="range" min="0.55" max="1.2" step="0.05" value={face.eyeOpenness ?? 1} onChange={(event) => onChange({ eyeOpenness: Number(event.target.value) })} /><b>{(face.eyeOpenness ?? 1).toFixed(2)}</b></label>
      <label className="range-field"><span>Blink</span><input type="range" min="0" max="1" step="0.05" value={face.blink} onChange={(event) => onChange({ blink: Number(event.target.value) })} /><b>{Math.round(face.blink * 100)}%</b></label>
    </section>
    <section className="inspector-section">
      <header>EYE EXPRESSION</header>
      <div className="preset-grid">{eyeExpressions.map((expression) => <button key={expression} className={face.eyeExpression === expression ? "active" : ""} onClick={() => onChange({ eyeExpression: expression })}>{expression}</button>)}</div>
    </section>
    <section className="inspector-section"><header>ACCESSORIES</header><label className="toggles"><input type="checkbox" checked={face.accessories.sunglasses.visible} onChange={(event) => onChange({ accessories: { ...face.accessories, sunglasses: { ...face.accessories.sunglasses, visible: event.target.checked } } })}/> Sunglasses</label></section>
    <section className="inspector-section">
      <header>SEPARATE EYE PARTS</header>
      {partNames.map(([name, label]) => <details className="face-part-editor" key={name}>
        <summary>{label}</summary>
        <div className="field-grid">
          <NumberField label="X" value={face.parts[name].x} onChange={(x) => changePart(name, { x })} />
          <NumberField label="Y" value={face.parts[name].y} onChange={(y) => changePart(name, { y })} />
          <NumberField label="Scale X" value={face.parts[name].scaleX} step={0.05} onChange={(scaleX) => changePart(name, { scaleX })} />
          <NumberField label="Scale Y" value={face.parts[name].scaleY} step={0.05} onChange={(scaleY) => changePart(name, { scaleY })} />
        </div>
      </details>)}
    </section>
    <section className="inspector-section">
      <header>MOUTH / VISEME</header>
      <div className="preset-grid">{productionVisemes.map((mouth) => <button key={mouth} className={face.mouth === mouth ? "active" : ""} onClick={() => onChange({ mouth })}>{mouth}</button>)}</div>
    </section>
    <section className="inspector-section">
      <header>{face.mouth.toUpperCase()} MOUTH TRANSFORM</header>
      <div className="field-grid">
        <NumberField label="X" value={mouthTransform.x} onChange={(x) => changeMouth({ x })} />
        <NumberField label="Y" value={mouthTransform.y} onChange={(y) => changeMouth({ y })} />
        <NumberField label="Scale X" value={mouthTransform.scaleX} step={0.05} onChange={(scaleX) => changeMouth({ scaleX })} />
        <NumberField label="Scale Y" value={mouthTransform.scaleY} step={0.05} onChange={(scaleY) => changeMouth({ scaleY })} />
        <NumberField label="Rotation" value={mouthTransform.rotation ?? 0} step={0.5} onChange={(rotation) => changeMouth({ rotation })} />
      </div>
    </section>
    <section className="inspector-section"><header>MOUTH PERFORMANCE</header><div className="field-grid"><NumberField label="Offset X" value={face.mouthOffsetX ?? 0} step={0.1} onChange={(mouthOffsetX) => onChange({ mouthOffsetX })}/><NumberField label="Offset Y" value={face.mouthOffsetY ?? 0} step={0.1} onChange={(mouthOffsetY) => onChange({ mouthOffsetY })}/><NumberField label="Rotation" value={face.mouthRotation ?? 0} step={0.5} onChange={(mouthRotation) => onChange({ mouthRotation })}/></div></section>
    <section className="inspector-section toggles"><label><input type="checkbox" checked={face.previewAutomation} onChange={(event) => onChange({ previewAutomation: event.target.checked })} /> Animate face during playback</label></section>
    <details className="advanced-face inspector-section">
      <summary>ADVANCED FACE CALIBRATION</summary>
      <label className="range-field"><span>Eye size</span><input type="range" min="0.7" max="1.4" step="0.01" value={calibration.eyeVisualScale} onChange={(event) => onCalibrationChange({ eyeVisualScale: Number(event.target.value) })} /><b>{Math.round(calibration.eyeVisualScale * 100)}%</b></label>
      <label className="range-field"><span>Mouth size</span><input type="range" min="0.5" max="1.1" step="0.01" value={calibration.mouthVisualScale} onChange={(event) => onCalibrationChange({ mouthVisualScale: Number(event.target.value) })} /><b>{Math.round(calibration.mouthVisualScale * 100)}%</b></label>
      <label className="range-field"><span>Gaze range X</span><input type="range" min="2" max="9" step="0.25" value={calibration.gazeRangeX} onChange={(event) => onCalibrationChange({ gazeRangeX: Number(event.target.value) })} /><b>{calibration.gazeRangeX.toFixed(1)}</b></label>
      <label className="range-field"><span>Gaze range Y</span><input type="range" min="1" max="6" step="0.25" value={calibration.gazeRangeY} onChange={(event) => onCalibrationChange({ gazeRangeY: Number(event.target.value) })} /><b>{calibration.gazeRangeY.toFixed(1)}</b></label>
      <label className="range-field"><span>Head rotation</span><input type="range" min="0.5" max="2" step="0.05" value={calibration.headRotationStrength} onChange={(event) => onCalibrationChange({ headRotationStrength: Number(event.target.value) })} /><b>{calibration.headRotationStrength.toFixed(2)}</b></label>
      {neck && <div className="field-grid"><NumberField label="Neck pivot X" value={neck.pivotX} onChange={(pivotX) => onNeckPivot({ pivotX, pivotY: neck.pivotY })} /><NumberField label="Neck pivot Y" value={neck.pivotY} onChange={(pivotY) => onNeckPivot({ pivotX: neck.pivotX, pivotY })} /></div>}
      <div className="debug-toggles">
        {([
          ["showNeckAnchor", "Neck anchor"], ["showHeadPivot", "Head pivot"], ["showEyeCenters", "Eye centers"], ["showGazeBounds", "Gaze bounds"], ["showCurrentGaze", "Current gaze"], ["showMouthAnchor", "Mouth anchor"], ["showEyeScaleBounds", "Eye bounds"], ["showLanguageMap", "Language map"],
        ] as Array<["showNeckAnchor" | "showHeadPivot" | "showEyeCenters" | "showGazeBounds" | "showCurrentGaze" | "showMouthAnchor" | "showEyeScaleBounds" | "showLanguageMap", string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={calibration[key]} onChange={(event) => onCalibrationChange({ [key]: event.target.checked })} /> {label}</label>)}
      </div>
    </details>
    <div className="face-help">Press Play on the timeline to preview deterministic blinking, gaze, and viseme changes.</div>
  </div>;
}
