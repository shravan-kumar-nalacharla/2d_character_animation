import { useEffect, useState } from "react";
import { createDefaultProject } from "../project/project";
import type { CryState, EyeExpression, FaceState } from "../project/schema";
import { FaceRig } from "./FaceRig";

export function CryQaPage() {
  const [time,setTime]=useState(0); useEffect(()=>{const started=performance.now();let frame=0;const tick=()=>{setTime((performance.now()-started)/1000);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[]);
  const transitionTime=time%6, transition: CryState=transitionTime<2?"aboutToCry":transitionTime<3?"firstTear":"cryStream";
  return <main className="cry-qa"><header><div><small>ALGOWZXD · DETERMINISTIC CRY SYSTEM QA</small><h1>Cute eyes, pre-cry tremble and face-contained water flow</h1></div><button onClick={()=>history.back()}>BACK</button></header><section className="cry-qa-grid">
    <Card title="TEST A · COMPLETE CUTE EYES" expression="sparkleCute" state="off" time={0}/>
    <Card title="TEST B · WATERY PRE-CRY · 5s" expression="teary" state="aboutToCry" time={time%5}/>
    <Card title={`TEST C · TRANSITION · ${transition}`} expression={transition==="cryStream"?"crying":"teary"} state={transition} time={transitionTime}/>
    <Card title="TEST D · CRY STREAM · 10s" expression="crying" state="cryStream" time={time%10}/>
    <Card title="TEST E · MATTE DEBUG" expression="crying" state="cryStream" time={time%2} debug/>
    <Card title="TEST F · HEAD MOVEMENT" expression="crying" state="cryStream" time={time%5} headRotation={Math.sin(time*1.4)*3}/>
    <Card title="REGRESSION · ANGRY EYES + MANUAL STREAM" expression="angry" state="cryStream" time={time%2}/>
  </section></main>;
}

function Card({title,expression,state,time,debug=false,headRotation=0}:{title:string;expression:EyeExpression;state:CryState;time:number;debug?:boolean;headRotation?:number}) {
  const project=createDefaultProject(), base=project.character.face, face:FaceState={...base,eyeExpression:expression,previewAutomation:false,cryControls:{...base.cryControls,state,showFaceMatte:debug}};
  return <article><svg viewBox="790 65 210 245"><g transform={`rotate(${headRotation} 894 205)`}><g transform="matrix(.65 0 0 .65 221.95 -72.55)"><image href="/production_character/illustrator2024/head/head.svg" width="1920" height="1080"/><image href="/production_character/illustrator2024/head/ears.svg" width="1920" height="1080"/></g><FaceRig face={face} calibration={project.character.calibration} assets={project.character.faceAssets!} time={time} playing/><g transform="matrix(.65 0 0 .65 221.95 -72.55)"><image href="/production_character/illustrator2024/head/hair.svg" width="1920" height="1080"/></g></g></svg><div><b>{title}</b><span>t={time.toFixed(2)}s · {state}</span></div></article>;
}
