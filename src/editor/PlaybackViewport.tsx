import { useEffect, useRef, useState } from "react";
import { MasterPlaybackClock, type PlaybackMetrics } from "../animation/MasterPlaybackClock";
import { preloadFaceAssets } from "../character/FaceAssetCache";
import type { Bone, ProjectDocument } from "../project/schema";
import { Viewport } from "./Viewport";

interface Props {
  project: ProjectDocument; selectedId: string; showBones: boolean; showControls: boolean; editPivots: boolean; playing: boolean; time: number; audioUrl: string;
  onSelect(id: string): void; onPreviewBone(id: string, bone: Bone): void; onCommitDrag(before: Bone, after: Bone): void; onTime(time: number): void; onStop(): void; onMetrics(metrics: PlaybackMetrics): void;
}

export function PlaybackViewport(props: Props) {
  const [renderTime, setRenderTime] = useState(props.time);
  const audioRef = useRef<HTMLAudioElement>(null), frameRef = useRef(0), clock = useRef(new MasterPlaybackClock()), lastUi = useRef(0), lastMetrics = useRef(0), frameProfile = useRef({ animationMs: 0, rigMs: 0, svgRenderMs: 0 });
  useEffect(() => { if (!props.playing) setRenderTime(props.time); }, [props.playing, props.time]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!props.playing) { audio?.pause(); cancelAnimationFrame(frameRef.current); return; }
    let active = true;
    void preloadFaceAssets(props.project.character.faceAssets).then(async () => {
      if (!active) return;
      const stamp = performance.now(); clock.current.start(props.time, stamp);
      if (audio && props.audioUrl) { audio.currentTime = props.time; await audio.play().catch(() => props.onStop()); }
      const tick = (now: number) => {
        if (!active) return;
        const next = clock.current.sample(now, props.project.stage.duration, audio);
        setRenderTime(next);
        if (now - lastUi.current >= 50) { props.onTime(next); lastUi.current = now; }
        if (now - lastMetrics.current >= 500) { props.onMetrics({ ...clock.current.metrics(props.project.stage.fps), ...frameProfile.current }); lastMetrics.current = now; }
        if (next >= props.project.stage.duration || audio?.ended) props.onStop(); else frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    });
    return () => { active = false; cancelAnimationFrame(frameRef.current); audio?.pause(); };
  }, [props.playing, props.audioUrl, props.project.stage.duration, props.project.stage.fps]);
  return <><audio ref={audioRef} src={props.audioUrl || undefined} preload="auto" /><Viewport project={props.project} selectedId={props.selectedId} showBones={props.showBones} showControls={props.showControls} onSelect={props.onSelect} onPreviewBone={props.onPreviewBone} onCommitDrag={props.onCommitDrag} currentTime={renderTime} playing={props.playing} editPivots={props.editPivots} onFrameProfile={(value) => { frameProfile.current = value; }} /></>;
}
