import { useState } from "react";
import type { AnimationTrack, ProjectDocument } from "../project/schema";

interface Props {
  project: ProjectDocument;
  currentTime: number;
  playing: boolean;
  onTime(time: number): void;
  onTogglePlay(): void;
  onTracks(tracks: AnimationTrack[]): void;
}

export function Timeline({ project, currentTime, playing, onTime, onTogglePlay, onTracks }: Props) {
  const [selectedKey, setSelectedKey] = useState<{ trackId: string; keyId: string } | null>(null);
  const { duration, fps } = project.stage;
  const ticks = Array.from({ length: Math.floor(duration) + 1 }, (_, index) => index);
  const percent = (currentTime / duration) * 100;
  const visibleTracks = project.animation.tracks.filter((track) => track.layer === "base" || track.layer === "manual" || track.keyframes.length);
  const rows = [
    ...(project.audio ? [{ id: "audio", name: "Audio", kind: "audio" as const }] : []),
    ...(project.transcript ? [{ id: "transcript", name: "Transcript", kind: "transcript" as const }] : []),
    ...(project.performance ? [{ id: "performance", name: "AI Performance", kind: "performance" as const }] : []),
    ...visibleTracks.map((track) => ({ id: track.id, name: track.name, kind: "track" as const, track })),
  ];

  return (
    <section className="timeline panel">
      <div className="transport">
        <button onClick={() => onTime(0)} title="Go to start">|◀</button>
        <button className="play" onClick={onTogglePlay} title="Play or pause">{playing ? "Ⅱ" : "▶"}</button>
        <button onClick={() => onTime(Math.min(duration, currentTime + 1 / fps))} title="Next frame">▶|</button>
        <span className="timecode">{formatTime(currentTime, fps)}</span>
        {selectedKey && <KeyEditor project={project} selected={selectedKey} onTracks={onTracks} onClear={() => setSelectedKey(null)} />}
        <span className="transport-meta">{fps} FPS · {project.stage.width}×{project.stage.height}</span>
      </div>
      <div className="timeline-body">
        <div className="track-labels">
          <div className="ruler-spacer">TRACKS</div>
          {rows.map((row) => <div className="track-label" key={row.id}><span className={`layer-dot ${row.kind === "track" ? row.track.layer : row.kind}`} />{row.name}<small>{row.kind === "track" ? row.track.keyframes.length : ""}</small></div>)}
        </div>
        <div className="track-canvas" onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          onTime(((event.clientX - bounds.left) / bounds.width) * duration);
        }}>
          <div className="ruler">
            {ticks.map((tick) => <span key={tick} style={{ left: `${(tick / duration) * 100}%` }}>{tick}s</span>)}
          </div>
          {rows.map((row) => <div className="track-lane" key={row.id}>
            {row.kind === "audio" && <Waveform values={project.audioAnalysis?.waveform ?? []} />}
            {row.kind === "transcript" && project.transcript?.segments.flatMap((segment) => segment.words).map((word, index) => <button className="timeline-word" key={`${word.start}-${index}`} style={spanStyle(word.start, word.end, duration)} onClick={(event) => { event.stopPropagation(); onTime(word.start); }}>{word.text}</button>)}
            {row.kind === "performance" && project.performance?.segments.map((segment) => <div className={`performance-clip emotion-${segment.emotion.primary}`} key={segment.id} style={spanStyle(segment.start, segment.end, duration)} title={`${segment.text}\n${segment.intent}`}>{segment.emotion.primary} {Math.round(segment.emotion.intensity * 100)}%</div>)}
            {row.kind === "track" && row.track.layer === "base" && <div className="base-clip">Base pose</div>}
            {row.kind === "track" && row.track.keyframes.map((keyframe) => <button className={`timeline-key ${typeof keyframe.value === "string" ? "string-key" : ""} ${selectedKey?.keyId === keyframe.id ? "selected" : ""}`} key={keyframe.id} style={{ left: `${(keyframe.time / duration) * 100}%` }} title={`${keyframe.time.toFixed(3)}s · ${String(keyframe.value)} · ${keyframe.source}`} onClick={(event) => { event.stopPropagation(); setSelectedKey({ trackId: row.track.id, keyId: keyframe.id }); onTime(keyframe.time); }}>{typeof keyframe.value === "string" ? String(keyframe.value) : ""}</button>)}
          </div>)}
          <div className="playhead" style={{ left: `${percent}%` }}><span /></div>
        </div>
      </div>
      <input
        aria-label="Timeline scrubber"
        className="timeline-scrubber"
        type="range"
        min={0}
        max={duration}
        step={1 / fps}
        value={currentTime}
        onChange={(event) => onTime(Number(event.target.value))}
      />
    </section>
  );
}

function KeyEditor({ project, selected, onTracks, onClear }: { project: ProjectDocument; selected: { trackId: string; keyId: string }; onTracks(tracks: AnimationTrack[]): void; onClear(): void }) {
  const track = project.animation.tracks.find((item) => item.id === selected.trackId);
  const keyframe = track?.keyframes.find((item) => item.id === selected.keyId);
  if (!track || !keyframe) return null;
  const change = (patch: Partial<typeof keyframe>) => onTracks(project.animation.tracks.map((item) => item.id === track.id ? { ...item, keyframes: item.keyframes.map((key) => key.id === keyframe.id ? { ...key, ...patch, source: "manual" as const } : key).sort((a, b) => a.time - b.time) } : item));
  return <div className="key-editor" onClick={(event) => event.stopPropagation()}><b>{track.name}</b><label>Time <input type="number" min="0" max={project.stage.duration} step={1 / project.stage.fps} value={keyframe.time} onChange={(event) => change({ time: Number(event.target.value) })} /></label><label>Value <input value={String(keyframe.value)} onChange={(event) => change({ value: track.valueType === "number" ? Number(event.target.value) : event.target.value })} /></label><select value={keyframe.interpolation} onChange={(event) => change({ interpolation: event.target.value as typeof keyframe.interpolation })}>{["hold", "linear", "ease-in", "ease-out", "ease-in-out", "bezier"].map((value) => <option key={value}>{value}</option>)}</select><button title="Delete keyframe" onClick={() => { onTracks(project.animation.tracks.map((item) => item.id === track.id ? { ...item, keyframes: item.keyframes.filter((key) => key.id !== keyframe.id) } : item)); onClear(); }}>Delete</button></div>;
}

function Waveform({ values }: { values: number[] }) {
  if (!values.length) return <span className="waveform-empty">Analyzing…</span>;
  return <svg className="waveform" viewBox={`0 0 ${values.length} 1`} preserveAspectRatio="none" aria-label="Audio waveform">{values.map((value, index) => <line key={index} x1={index + 0.5} x2={index + 0.5} y1={0.5 - value * 0.45} y2={0.5 + value * 0.45} />)}</svg>;
}

function spanStyle(start: number, end: number, duration: number) {
  return { left: `${(start / duration) * 100}%`, width: `${Math.max(0.35, ((end - start) / duration) * 100)}%` };
}

function formatTime(time: number, fps: number): string {
  const seconds = Math.floor(time);
  const frames = Math.floor((time - seconds) * fps);
  return `00:00:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}
