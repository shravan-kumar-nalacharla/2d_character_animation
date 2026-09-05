import { useCallback, useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Viewport } from "../src/editor/Viewport";
import type { RemotionRenderProps } from "./types";
import "../src/editor/styles.css";
import "./render.css";

const noop = () => undefined;

export function CharacterComposition({ project, settings, audioUrl }: RemotionRenderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolveAssetUrl = useCallback((url: string) => url.startsWith("data:") || /^https?:/i.test(url) ? url : staticFile(url.replace(/^\//, "")), []);
  const [waitHandle] = useState(() => delayRender("Loading Algowzxd SVG and face assets"));
  const continued = useRef(false);
  const ready = useCallback(() => {
    if (continued.current) return;
    continued.current = true;
    continueRender(waitHandle);
  }, [waitHandle]);
  useEffect(() => { const fallback = window.setTimeout(ready, 2500); return () => clearTimeout(fallback); }, [ready]);
  const cleanProject = {
    ...project,
    stage: {
      ...project.stage,
      background: settings.background === "solid" ? settings.color : project.stage.background,
      backgroundMode: settings.background === "transparent" ? "transparent" as const : "solid" as const,
    },
    character: {
      ...project.character,
      calibration: {
        ...project.character.calibration,
        showNeckAnchor: false,
        showHeadPivot: false,
        showEyeCenters: false,
        showGazeBounds: false,
        showCurrentGaze: false,
        showMouthAnchor: false,
        showEyeScaleBounds: false,
        showLanguageMap: false,
      },
    },
  };
  return <AbsoluteFill className={`remotion-root fit-${settings.fit.toLowerCase()}`}>
    <Viewport project={cleanProject} selectedId="" showBones={false} showControls={false} onSelect={noop} onPreviewBone={noop} onCommitDrag={noop} currentTime={frame / fps} playing={false} editPivots={false} onArtworkReady={ready} resolveAssetUrl={resolveAssetUrl} />
    {settings.includeAudio && audioUrl ? <Audio src={audioUrl} /> : null}
  </AbsoluteFill>;
}
