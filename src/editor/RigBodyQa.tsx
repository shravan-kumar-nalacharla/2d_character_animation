import { useMemo, useState } from 'react';
import { createDefaultProject } from '../project/project';
import { bodyPerformanceTracks, type Gesture } from '../animation/BodyPerformance';
import { bodyViews, type BodyView } from '../rig/FullBody';
import { Viewport } from './Viewport';
import type { PerformancePlan } from '../project/schema';

export const qaPoses: Gesture[]=['idle','thinking','hand-on-chin','wave','folded-arms','explain-both','point-left','hands-on-hips','raise-hand','walk','facepalm','thumbs-up','celebration','run'];
export function RigBodyQa() {
  const [pose,setPose]=useState<Gesture>('thinking'),[time,setTime]=useState(1.4),[bones,setBones]=useState(false),[anchors,setAnchors]=useState(false),[view,setView]=useState<BodyView>('front'),[head,setHead]=useState(0),[guides,setGuides]=useState<string[]>([]);
  const project=useMemo(()=>{
    const value=createDefaultProject(); value.character.view=view;
    const plan:PerformancePlan={version:1,provider:'rule-based',promptVersion:'v1',overall:{language:'en',mood:'neutral',energy:.7,speakingStyle:'natural'},segments:[{id:'qa',start:0,end:4,text:'',emotion:{primary:'neutral',intensity:.8},intent:'statement',expression:{preset:'neutral',intensity:0,transitionIn:.2,transitionOut:.2},gaze:{target:'camera',intensity:0},headEvents:[],bodyEvents:[],eyebrowEvents:[],accents:[],direction:{gesture:pose}}]};
    value.animation.tracks=bodyPerformanceTracks(plan,value.performanceProfile);
    value.animation.tracks.push({id:'qa-guides',name:'QA guides',target:'body.debug',layer:'manual',valueType:'string',generated:false,muted:false,locked:false,keyframes:[{id:'qa-guides-key',time:0,value:guides.join(','),interpolation:'hold',source:'manual'}]});
    value.rig.bones=value.rig.bones.map(b=>b.id==='head'?{...b,rotation:head}:b);
    return value;
  },[pose,view,head,guides]);
  return <main className="rig-body-qa" style={{padding:16,height:'100vh',boxSizing:'border-box',display:'grid',gridTemplateRows:'auto 1fr auto'}}>
    <div><strong>Body rig regression poses</strong> <label>Pose <select value={pose} onChange={e=>setPose(e.target.value as Gesture)}>{qaPoses.map(p=><option key={p}>{p}</option>)}</select></label> <label>View <select value={view} onChange={e=>setView(e.target.value as BodyView)}>{bodyViews.map(v=><option key={v}>{v}</option>)}</select></label> <label><input type="checkbox" checked={bones} onChange={e=>setBones(e.target.checked)}/>Bones</label> <label><input type="checkbox" checked={anchors} onChange={e=>setAnchors(e.target.checked)}/>Joint / IK / pole anchors</label> {['Collision shapes','Attachment anchors','Neck mask','Z-order','Artwork bounds'].map(label=><label key={label}><input type="checkbox" checked={guides.includes(label)} onChange={e=>setGuides(e.target.checked?[...guides,label]:guides.filter(g=>g!==label))}/>{label}</label>)} <label>Head rotation <input type="range" min="-25" max="25" value={head} onChange={e=>setHead(+e.target.value)}/></label></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,minHeight:0}}>{(['hoodie','stick'] as const).map(mode=><section key={mode} style={{display:'grid',gridTemplateRows:'24px 1fr',minHeight:0,background:'repeating-conic-gradient(#d8dde3 0% 25%,#eef0f3 0% 50%) 0 / 24px 24px'}}><strong>{mode}</strong><Viewport initialViewBox={{x:600,y:0,width:610,height:960}} project={{...project,stage:{...project.stage,backgroundMode:'transparent'},character:{...project.character,mode}}} currentTime={time} playing={false} selectedId="" showBones={bones} showControls={anchors} editPivots={false} onSelect={()=>{}} onPreviewBone={()=>{}} onCommitDrag={()=>{}}/></section>)}</div>
    <label>Frame time <input type="range" min="0" max="4" step=".01" value={time} onChange={e=>setTime(+e.target.value)}/>{time.toFixed(2)} s</label>
  </main>;
}

