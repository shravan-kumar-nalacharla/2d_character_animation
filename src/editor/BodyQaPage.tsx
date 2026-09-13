import { useEffect, useState } from 'react';
import { createDefaultProject } from '../project/project';
import { BodyControls } from './BodyControls';
import { Viewport } from './Viewport';

/** Isolated visual rehearsal: never reads or writes the editor autosave. */
export function BodyQaPage() {
  const [project, setProject] = useState(createDefaultProject), [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [debug, setDebug] = useState(false);
  useEffect(() => { if (!playing) return; let frame = 0, last = performance.now(); const tick = (now: number) => { setTime(t => (t + (now-last)/1000) % 4); last = now; frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [playing]);
  return <div style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
    <BodyControls rehearsal project={project} onChange={setProject} onTime={setTime} debug={debug} onDebug={() => setDebug(!debug)} />
    <Viewport project={project} currentTime={time} playing={playing} selectedId="" showBones={false} showControls={debug} editPivots={false} onSelect={() => {}} onPreviewBone={() => {}} onCommitDrag={() => {}} />
    <div><button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button><input aria-label="Rehearsal time" type="range" min="0" max="4" step=".016667" value={time} onChange={e => setTime(Number(e.target.value))} />{time.toFixed(2)} seconds</div>
  </div>;
}
