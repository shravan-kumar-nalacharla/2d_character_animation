import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyToPoint, toSvgMatrix, type Point } from "../core/math/matrix";
import { evaluateBones, evaluateFace } from "../animation/evaluate";
import type { Bone, ProjectDocument } from "../project/schema";
import { calculateWorldMatrices, findBoneForArtwork } from "../rig/Skeleton";
import { FaceRig } from "./FaceRig";

interface Props {
  project: ProjectDocument;
  selectedId: string;
  showBones: boolean;
  showControls: boolean;
  onSelect(id: string): void;
  onPreviewBone(id: string, bone: Bone): void;
  onCommitDrag(before: Bone, after: Bone): void;
  currentTime: number;
  playing: boolean;
  editPivots: boolean;
  onFrameProfile?(value: { animationMs: number; rigMs: number; svgRenderMs: number }): void;
  onArtworkReady?(): void;
  resolveAssetUrl?(url: string): string;
}

interface ViewBox { x: number; y: number; width: number; height: number }
const identityAssetUrl = (url: string) => url;

export function Viewport({ project, selectedId, showBones, showControls, onSelect, onPreviewBone, onCommitDrag, currentTime, playing, editPivots, onFrameProfile, onArtworkReady, resolveAssetUrl = identityAssetUrl }: Props) {
  const renderStarted = performance.now(), profileRef = useRef({ animationMs: 0, rigMs: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const artworkRef = useRef<SVGGElement>(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [zoomLabel, setZoomLabel] = useState(100);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1920, height: 1080 });
  const panRef = useRef<{ x: number; y: number; viewBox: ViewBox } | null>(null);
  const dragRef = useRef<{ boneId: string; kind: "move" | "pivot" | "rotate"; start: Point; center?: Point; startAngle?: number; before: Bone; after: Bone } | null>(null);
  const animatedBones = useMemo(() => { const started = performance.now(), value = evaluateBones(project.rig.bones, project.animation.tracks, currentTime); profileRef.current.animationMs = performance.now() - started; return value; }, [project.animation.tracks, project.rig.bones, currentTime]);
  const animatedFace = useMemo(() => { const started = performance.now(), value = evaluateFace(project.character.face, project.animation.tracks, currentTime); profileRef.current.animationMs += performance.now() - started; return value; }, [project.animation.tracks, project.character.face, currentTime]);
  const hasGeneratedAnimation = project.animation.tracks.some((track) => track.generated && track.keyframes.length);
  const world = useMemo(() => { const started = performance.now(), value = calculateWorldMatrices(animatedBones); profileRef.current.rigMs = performance.now() - started; return value; }, [animatedBones]);
  const currentWord = project.transcript?.segments.flatMap((segment) => segment.words).find((word) => word.start <= currentTime && word.end >= currentTime);
  const currentPerformance = project.performance?.segments.find((segment) => segment.start <= currentTime && segment.end >= currentTime);
  const animatedHead = animatedBones.find((bone) => bone.id === "head"), baseHead = project.rig.bones.find((bone) => bone.id === "head");
  const animatedNeck = animatedBones.find((bone) => bone.id === "neck"), baseNeck = project.rig.bones.find((bone) => bone.id === "neck");
  const faceHeadMotion = { rotation: (animatedHead?.rotation ?? 0) - (baseHead?.rotation ?? 0) + (animatedNeck?.rotation ?? 0) - (baseNeck?.rotation ?? 0), x: (animatedNeck?.x ?? 0) - (baseNeck?.x ?? 0), y: (animatedNeck?.y ?? 0) - (baseNeck?.y ?? 0) };

  useEffect(() => {
    fetch(resolveAssetUrl(project.character.artworkUrl))
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load SVG (${response.status}).`);
        return response.text();
      })
      .then(setSource)
      .catch((reason: Error) => setError(reason.message));
  }, [project.character.artworkUrl, resolveAssetUrl]);

  useLayoutEffect(() => {
    if (!source || !artworkRef.current) return;
    const parsed = new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
    artworkRef.current.innerHTML = parsed.innerHTML;
    artworkRef.current.querySelectorAll<SVGImageElement>("image").forEach((image) => {
      const href = image.getAttribute("href") || image.getAttribute("xlink:href");
      if (href) image.setAttribute("href", resolveAssetUrl(href));
    });
    const groups = Array.from(artworkRef.current.children).filter((child) => child.tagName.toLowerCase() === "g") as SVGGElement[];
    for (const group of groups) {
      const use = group.querySelector("use");
      const artworkId = group.dataset.rigArt ?? (use?.getAttribute("href") ?? use?.getAttribute("xlink:href") ?? "").replace(/^#/, "");
      const bone = findBoneForArtwork(project.rig.bones, artworkId);
      if (!bone) continue;
      const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
      wrapper.dataset.rigNode = bone.id;
      group.before(wrapper);
      wrapper.appendChild(group);
    }
    const images = Array.from(svgRef.current?.querySelectorAll("image") ?? []);
    Promise.all(images.map((node) => {
      const href = node.getAttribute("href") || node.getAttribute("xlink:href");
      if (!href) return Promise.resolve();
      const image = new Image();
      return new Promise<void>((resolve) => { image.onload = image.onerror = () => resolve(); image.src = href; });
    })).then(() => requestAnimationFrame(() => requestAnimationFrame(() => onArtworkReady?.())));
  }, [onArtworkReady, project.rig.bones, resolveAssetUrl, source]);

  useLayoutEffect(() => {
    const root = artworkRef.current;
    if (!root) return;
    root.querySelectorAll<SVGGElement>("[data-rig-node]").forEach((wrapper) => {
      const id = wrapper.dataset.rigNode!;
      const matrix = world.get(id);
      const bone = animatedBones.find((item) => item.id === id);
      if (matrix) wrapper.setAttribute("transform", toSvgMatrix(matrix));
      wrapper.style.display = bone?.visible === false ? "none" : "";
      wrapper.classList.toggle("art-selected", id === selectedId);
    });
  }, [animatedBones, selectedId, source, world]);
  useLayoutEffect(() => { onFrameProfile?.({ ...profileRef.current, svgRenderMs: performance.now() - renderStarted }); });

  const stagePoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const startControllerDrag = (event: React.PointerEvent, boneId: string, kind: "move" | "pivot" | "rotate" = "move") => {
    event.stopPropagation();
    const bone = project.rig.bones.find((item) => item.id === boneId);
    if (!bone || bone.locked) return;
    onSelect(boneId);
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = stagePoint(event.clientX, event.clientY);
    const center = bonePoints.get(boneId);
    dragRef.current = { boneId, kind, start, center, startAngle: center ? Math.atan2(start.y - center.y, start.x - center.x) * 180 / Math.PI : 0, before: bone, after: bone };
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const point = stagePoint(event.clientX, event.clientY);
      const { before, start, boneId, kind, center, startAngle = 0 } = dragRef.current;
      let after: Bone;
      if (kind === "pivot") after = { ...before, pivotX: before.pivotX + point.x - start.x, pivotY: before.pivotY + point.y - start.y };
      else if (kind === "rotate" && center) {
        const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
        after = { ...before, rotation: Math.max(before.minRotation, Math.min(before.maxRotation, before.rotation + angle - startAngle)) };
      } else after = { ...before, x: before.x + point.x - start.x, y: before.y + point.y - start.y };
      dragRef.current.after = after;
      onPreviewBone(boneId, after);
      return;
    }
    if (panRef.current) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const dx = ((event.clientX - panRef.current.x) / bounds.width) * panRef.current.viewBox.width;
      const dy = ((event.clientY - panRef.current.y) / bounds.height) * panRef.current.viewBox.height;
      setViewBox({ ...panRef.current.viewBox, x: panRef.current.viewBox.x - dx, y: panRef.current.viewBox.y - dy });
    }
  };

  const endPointer = () => {
    if (dragRef.current) onCommitDrag(dragRef.current.before, dragRef.current.after);
    dragRef.current = null;
    panRef.current = null;
  };

  const zoom = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.12 : 0.88;
    const nextWidth = Math.min(3840, Math.max(360, viewBox.width * factor));
    const nextHeight = nextWidth * (1080 / 1920);
    const point = stagePoint(event.clientX, event.clientY);
    const rx = (point.x - viewBox.x) / viewBox.width;
    const ry = (point.y - viewBox.y) / viewBox.height;
    setViewBox({ x: point.x - rx * nextWidth, y: point.y - ry * nextHeight, width: nextWidth, height: nextHeight });
    setZoomLabel(Math.round((1920 / nextWidth) * 100));
  };

  const bonePoints = new Map(animatedBones.map((bone) => [
    bone.id,
    applyToPoint(world.get(bone.id)!, { x: bone.pivotX, y: bone.pivotY }),
  ]));

  return (
    <main className="viewport-shell">
      <div className="viewport-toolbar">
        <span>Viewport</span>
        <div className="viewport-status"><span>{zoomLabel}%</span><span>{editPivots ? "Drag joints to edit anchors · drag square to rotate" : "Middle-drag to pan · Wheel to zoom"}</span></div>
      </div>
      <div className="viewport-canvas">
        {error && <div className="viewport-error">{error}</div>}
        <svg
          ref={svgRef}
          className="character-stage"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onWheel={zoom}
          onPointerDown={(event) => {
            if (event.button === 1) {
              panRef.current = { x: event.clientX, y: event.clientY, viewBox };
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            const target = (event.target as Element).closest<SVGGElement>("[data-rig-node]");
            if (target?.dataset.rigNode) onSelect(target.dataset.rigNode);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <rect x="0" y="0" width="1920" height="1080" className="stage-background" style={{ fill: project.stage.backgroundMode === "transparent" ? "none" : project.stage.background }} />
          <g ref={artworkRef} className="character-artwork" />
          <g transform={world.get("head") ? toSvgMatrix(world.get("head")!) : undefined}>
            <FaceRig
              face={hasGeneratedAnimation ? { ...animatedFace, previewAutomation: false } : animatedFace}
              calibration={project.character.calibration}
              assets={project.character.faceAssets}
              headMotion={faceHeadMotion}
              time={currentTime}
              playing={playing}
              resolveAssetUrl={resolveAssetUrl}
            />
          </g>
          {project.character.calibration.showNeckAnchor && bonePoints.get("neck") && (() => {
            const point = bonePoints.get("neck")!;
            return <g className="anchor-debug"><circle cx={point.x} cy={point.y} r="18" /><path d={`M ${point.x - 28} ${point.y} H ${point.x + 28} M ${point.x} ${point.y - 28} V ${point.y + 28}`} /><text x={point.x + 25} y={point.y - 22}>NECK PIVOT</text></g>;
          })()}
          {project.character.calibration.showHeadPivot && bonePoints.get("head") && (() => {
            const point = bonePoints.get("head")!;
            return <g className="anchor-debug"><circle cx={point.x} cy={point.y} r="14" /><path d={`M ${point.x - 22} ${point.y} H ${point.x + 22} M ${point.x} ${point.y - 22} V ${point.y + 22}`} /><text x={point.x + 20} y={point.y - 18}>HEAD PIVOT</text></g>;
          })()}
          <rect x="36" y="36" width="1848" height="1008" className="safe-frame" />
          {showBones && (
            <g className="bones-overlay">
              {project.rig.bones.map((bone) => {
                const point = bonePoints.get(bone.id)!;
                const parent = bone.parentId ? bonePoints.get(bone.parentId) : undefined;
                return (
                  <g key={bone.id} className={bone.id === selectedId ? "selected" : ""} onPointerDown={(event) => startControllerDrag(event, bone.id, editPivots ? "pivot" : "move")}>
                    {parent && <line x1={parent.x} y1={parent.y} x2={point.x} y2={point.y} />}
                    <circle cx={point.x} cy={point.y} r={bone.id === selectedId ? 10 : 7} />
                    <path d={`M ${point.x - 13} ${point.y} H ${point.x + 13} M ${point.x} ${point.y - 13} V ${point.y + 13}`} />
                    {bone.id === selectedId && <>
                      <line className="rotation-arm" x1={point.x} y1={point.y} x2={point.x} y2={point.y - 42} />
                      <rect className="rotation-handle" x={point.x - 6} y={point.y - 48} width="12" height="12" onPointerDown={(event) => startControllerDrag(event, bone.id, "rotate")} />
                    </>}
                  </g>
                );
              })}
            </g>
          )}
          {showControls && (
            <g className="controls-overlay">
              {project.rig.controllers.filter((control) => control.visible).map((control) => {
                const point = bonePoints.get(control.boneId)!;
                return (
                  <g key={control.id} onPointerDown={(event) => startControllerDrag(event, control.boneId, "move")}>
                    <circle cx={point.x} cy={point.y} r={control.size} style={{ stroke: control.color }} />
                    <text x={point.x} y={point.y - control.size - 9}>{control.name.replace(" Control", "")}</text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
        {project.character.calibration.showLanguageMap && <div className="face-state-debug"><b>FACE STATE</b><span>WORD <strong>{currentWord?.text ?? "—"}</strong></span><span>LANG <strong>{currentWord?.language?.toUpperCase() ?? "—"}</strong></span><span>VISEME <strong>{animatedFace.mouth}</strong></span><span>MOUTH <strong>{project.character.calibration.mouthVisualScale.toFixed(2)} · X {(animatedFace.mouthOffsetX ?? 0).toFixed(1)} · Y {(animatedFace.mouthOffsetY ?? 0).toFixed(1)}</strong></span><span>JAW / LIPS <strong>{(animatedFace.jawOpen ?? 0).toFixed(2)} · W {(animatedFace.mouthWidth ?? 0).toFixed(2)} · R {(animatedFace.lipRound ?? 0).toFixed(2)}</strong></span><span>EYES <strong>{animatedFace.eyeExpression} · open {(animatedFace.eyeOpenness ?? 1).toFixed(2)}</strong></span><span>GAZE <strong>X {animatedFace.gazeX.toFixed(2)} · Y {animatedFace.gazeY.toFixed(2)}</strong></span><span>BLINK <strong>{animatedFace.blink > .5 ? "closed" : "open"}</strong></span><span>HEAD <strong>{currentPerformance?.headEvents[0]?.type ?? "hold"}</strong></span><span>REASON <strong>{currentPerformance?.intent ?? "—"}</strong></span></div>}
      </div>
      <div className="viewport-footer"><span className="green-dot" /> SVG Preview <span>·</span> Seed {project.seed}</div>
    </main>
  );
}
