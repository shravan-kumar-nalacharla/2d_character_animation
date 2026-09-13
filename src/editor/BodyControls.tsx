import { useState } from 'react';
import { bodyViews, type BodyView } from '../rig/FullBody';
import { bodyPerformanceTracks, gestures, type Gesture } from '../animation/BodyPerformance';
import type { PerformancePlan, ProjectDocument } from '../project/schema';

export function BodyControls({ project, onChange, onTime, debug, onDebug, time = 0, rehearsal = false }: { project: ProjectDocument; onChange(project: ProjectDocument): void; onTime(time: number): void; debug: boolean; onDebug(): void; time?: number; rehearsal?: boolean }) {
  const [gesture, setGesture] = useState<Gesture>('explain-both');
  const preview = () => {
    const plan: PerformancePlan = { version: 1, provider: 'rule-based', promptVersion: 'v1', overall: { language: 'en', mood: 'neutral', energy: .7, speakingStyle: 'natural' }, segments: [{ id: 'pose-preview', start: 0, end: 4, text: '', emotion: { primary: 'neutral', intensity: .8 }, intent: 'statement', expression: { preset: 'neutral', intensity: 0, transitionIn: .2, transitionOut: .2 }, gaze: { target: 'camera', intensity: 0 }, eyebrowEvents: [], headEvents: [], bodyEvents: [], accents: [], direction: { gesture } }] };
    const generated = bodyPerformanceTracks(plan, { ...project.performanceProfile, gestureFrequency: 1 });
    const start = rehearsal ? 0 : time;
    const clips = generated.map(track => ({ ...track, id: `${track.id}-${start}`, generated: false, layer: 'manual' as const, activeRange: [start, start+4] as [number,number], keyframes: track.keyframes.map(key => ({ ...key, time: key.time+start, source: 'manual' as const })) }));
    onChange({ ...project, stage: { ...project.stage, duration: Math.max(project.stage.duration, start+4) }, animation: { tracks: [...(rehearsal ? [] : project.animation.tracks), ...clips] } }); onTime(start+1.4);
  };
  return <details className="body-controls"><summary>Body performance</summary><div>
    <label>Character <select aria-label="Character" value={project.character.mode ?? 'hoodie'} onChange={e => onChange({ ...project, performanceProfile:{...project.performanceProfile,characterVariant:e.target.value as 'hoodie'|'stick'}, character: { ...project.character, mode: e.target.value as 'hoodie' | 'stick', curvedLimbs: true } })}><option value="hoodie">Hoodie</option><option value="stick">Stick</option></select></label>
    <label>View <select aria-label="View" value={project.character.view ?? 'front'} onChange={e => onChange({ ...project, character: { ...project.character, view: e.target.value as BodyView } })}>{bodyViews.map(view => <option key={view}>{view}</option>)}</select></label>
    {(['fullBodyStrength', 'gestureStrength', 'gestureFrequency'] as const).map((key,index) => <label key={key}>{['Full-body strength', 'Gesture strength', 'Gesture frequency'][index]} <input aria-label={key} type="range" min="0" max="1" step=".05" value={project.performanceProfile[key] ?? .8} onChange={e => onChange({ ...project, performanceProfile: { ...project.performanceProfile, [key]: Number(e.target.value) } })} /></label>)}
    <label>Scene <input aria-label="Scene description" placeholder="Optional scene direction" maxLength={240} value={project.performanceProfile.sceneDescription??''} onChange={e=>onChange({...project,performanceProfile:{...project.performanceProfile,sceneDescription:e.target.value}})}/></label>
    <button onClick={onDebug} aria-pressed={debug}>IK / debug</button>
    <label>Gesture <select aria-label="Gesture" value={gesture} onChange={e => setGesture(e.target.value as Gesture)}>{gestures.map(g => <option key={g}>{g}</option>)}</select></label><button onClick={preview}>Insert gesture clip</button>
  </div></details>;
}
