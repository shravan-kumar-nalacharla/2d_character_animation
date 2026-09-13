/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { readFileSync, existsSync } from 'node:fs';
import { bodyPerformanceTracks, directBody, gestures } from './BodyPerformance';
import { createDefaultProject, defaultFace, defaultPerformanceProfile, upgradeBodyRig } from '../project/project';
import { bodyManifests, profileBones, blendLimb, bodyViews, distance, handPoses, limbCurve, solveLimb, viewInfo, walkingFoot } from '../rig/FullBody';
import { inverse, applyToPoint, aroundPivot } from '../core/math/matrix';
import { validateLimb, validateContacts, validatePose } from '../rig/PoseValidation';
import { calculateWorldMatrices } from '../rig/Skeleton';
import { bodyState, BodyRig, poseBody, solveBodyLimb } from '../editor/BodyRig';
import { evaluateBones, evaluateTrack } from './evaluate';
import { FaceRig, resolveFacePreview } from '../editor/FaceRig';
import { speechMouthGeometry } from '../character/SpeechMouth';
import { pronunciationUnits, VisemeMapper } from '../character/VisemeMapper';
import { VisemeSequenceOptimizer } from './VisemeSequenceOptimizer';
import { transcriptFromText } from '../director/PerformanceProviders';
import type { AnimationTrack, PerformancePlan, PerformanceSegment } from '../project/schema';

const segment = (text = 'Three things', start = 0): PerformanceSegment => ({ id: `s-${start}`, start, end: start+3, text, emotion: { primary: 'neutral', intensity: .7 }, intent: 'explanation', expression: { preset: 'neutral', intensity: .6, transitionIn: .2, transitionOut: .3 }, gaze: { target: 'camera', intensity: .5 }, headEvents: [], bodyEvents: [], eyebrowEvents: [], accents: [] });
const plan = (segments: PerformanceSegment[]): PerformancePlan => ({ version: 1, provider: 'rule-based', promptVersion: 'v1', overall: { language: 'en', mood: 'neutral', energy: .7, speakingStyle: 'normal' }, segments });
const profile = defaultPerformanceProfile();

describe('whole-body performance', () => {
  it('preserves parent-space attachment distances under rotated scaled roots', () => {
    const solved=solveLimb({x:0,y:0},{x:80,y:100},100,100,{x:-100,y:100});
    for(let rotation=-120;rotation<=120;rotation+=10) {
      const matrix=aroundPivot({x:0,y:0},123,45,rotation,1.3,1.3);
      const world=applyToPoint(matrix,solved.end), local=applyToPoint(inverse(matrix),world);
      expect(distance(local,solved.end)).toBeLessThan(1e-8);
      expect(validateLimb(solved,{x:0,y:0},100,100)).toEqual([]);
    }
  });
  it('uses compact attachment-free stick proportions without changing saved bones', () => {
    const saved=createDefaultProject().rig.bones, derived=profileBones(saved,'stick');
    expect(bodyManifests.stick.handSystem).toBe('round-cap'); expect(bodyManifests.stick.footSystem).toBe('round-cap');
    expect(bodyManifests.stick.armWidth).toBe(6);
    expect(derived.find(b=>b.id==='footL')!.pivotY).toBe(877);
    expect(saved.find(b=>b.id==='footL')!.pivotY).toBe(905);
  });
  it('clamps neck motion and keeps a skull-base head pivot', () => {
    const bones=profileBones(createDefaultProject().rig.bones,'hoodie').map(b=>b.id==='neck'?{...b,x:90,y:-100,rotation:35}:b);
    const posed=poseBody(bones,{}),neck=posed.find(b=>b.id==='neck')!;
    expect(neck.x).toBe(3);expect(neck.y).toBe(-3);expect(neck.rotation).toBe(8);
    expect(posed.find(b=>b.id==='head')!.pivotY).toBe(245);
  });
  it('has finite soft reach with configurable mirrored bend and exact lengths', () => {
    for(const sign of [-1,1] as const) for(let x=190;x<210;x+=.2) {
      const solved=solveLimb({x:0,y:0},{x,y:0},100,100,{x:0,y:100},{softness:5,minBend:5,maxBend:155,bendDirection:sign});
      expect(Math.sign(solved.joint.y)).toBe(sign); expect(validateLimb(solved,{x:0,y:0},100,100)).toEqual([]);
    }
  });
  it('reports unintended crossings but allows authored contact poses', () => {
    const left={start:{x:0,y:0},joint:{x:0,y:1},end:{x:2,y:3}},right={start:{x:2,y:0},joint:{x:2,y:1},end:{x:0,y:3}};
    expect(validateContacts(left,right,'wave')).toContain('crossed-forearms');
    expect(validateContacts(left,right,'folded-arms')).toEqual([]);
  });
  it('keeps every rendered shoulder and wrist connected through the failed QA clips', () => {
    for(const mode of ['hoodie','stick'] as const) for(const gesture of ['thinking','wave','folded-arms','explain-both','hands-on-hips'] as const) {
      const project=createDefaultProject(); project.character.mode=mode;
      const tracks=bodyPerformanceTracks(plan([{...segment(),direction:{gesture}}]),profile);
      for(let frame=0;frame<=90;frame++) {
        const state=bodyState(tracks,frame/30),bones=poseBody(evaluateBones(profileBones(project.rig.bones,mode),tracks,frame/30),state),world=calculateWorldMatrices(bones);
        for(const side of ['L','R'] as const) {
          const rig=solveBodyLimb(project,bones,world,state,side,false);
          expect(validateLimb(rig.solved,rig.start,rig.upper,rig.lower)).toEqual([]);
        }
      }
    }
  });
  it('blends IK and FK without changing either segment length or endpoint poses', () => {
    const fk=solveLimb({x:0,y:0},{x:80,y:100},100,100,{x:-100,y:100}),ik=solveLimb({x:0,y:0},{x:150,y:50},100,100,{x:-100,y:100});
    for(let t=0;t<=1;t+=.05) expect(validateLimb(blendLimb(fk,ik,t),fk.start,100,100)).toEqual([]);
    expect(distance(blendLimb(fk,ik,0).end,fk.end)).toBeLessThan(1e-8);
    expect(distance(blendLimb(fk,ik,1).end,ik.end)).toBeLessThan(1e-8);
  });
  it('preserves custom head pivots and stick pivot edits during profile derivation', () => {
    const bones=createDefaultProject().rig.bones.map(b=>b.id==='head'?{...b,pivotX:777}:b.id==='upperArmR'?{...b,pivotX:b.pivotX+4}:b);
    expect(profileBones(bones,'hoodie').find(b=>b.id==='head')!.pivotX).toBe(777);
    expect(profileBones(bones,'stick').find(b=>b.id==='upperArmR')!.pivotX).toBe(835);
  });
  it('reports neck containment and character-specific attachment violations', () => {
    const limb={start:{x:800,y:325},joint:{x:780,y:425},end:{x:790,y:525}};
    expect(validatePose({left:limb,right:limb,gesture:'idle',variant:'stick',handAssets:true,shoeAssets:true,neck:{x:960,y:240},zOrder:['armL','armL']})).toEqual(expect.arrayContaining(['neck-outside-collar','incorrect-stick-attachment','invalid-z-order']));
  });
  it('clamps unreachable IK targets while retaining exact segment lengths', () => {
    for (const end of [{x:1000,y:0},{x:0,y:0},{x:50,y:120}]) {
      const limb = solveLimb({x:0,y:0},end,100,120,{x:100,y:100});
      expect(distance(limb.start,limb.joint)).toBeCloseTo(100,6);
      expect(distance(limb.joint,limb.end)).toBeCloseTo(120,6);
      expect(Object.values(limb.joint).every(Number.isFinite)).toBe(true);
    }
    expect(() => solveLimb({x:0,y:0},{x:1,y:1},0,1,{x:1,y:0})).toThrow();
  });
  it('keeps elbow and knee curves C1 continuous through the bend', () => {
    for (let angle=-2; angle<=2; angle+=.1) {
      const joint = {x:100,y:100}, end = {x:100+Math.cos(angle)*100,y:100+Math.sin(angle)*100};
      const {controls,path} = limbCurve({x:0,y:0},joint,end);
      expect(joint.x-controls[1].x).toBeCloseTo(controls[2].x-joint.x,9);
      expect(joint.y-controls[1].y).toBeCloseTo(controls[2].y-joint.y,9);
      expect(path).not.toMatch(/NaN|Infinity|L /);
    }
  });
  it('locks stance feet independent of sampling order and includes swing lift', () => {
    const a=walkingFoot(.1,'R'), b=walkingFoot(.5,'R');
    expect(a.x).toBe(b.x); expect(a.y).toBeCloseTo(0); expect(b.planted).toBe(true);
    expect(walkingFoot(.8,'R').y).toBeLessThan(-20);
    expect(walkingFoot(0,'R')).toEqual(walkingFoot(0,'R'));
    expect(walkingFoot(.999999,'R').x).toBeCloseTo(walkingFoot(1,'R').x,6);
  });
  it('produces deterministic clips with cooldown and no contradictory overlap', () => {
    const input=plan(Array.from({length:12},(_,i)=>segment(i%2?'Hello':'Three things',i*.5)));
    const a=bodyPerformanceTracks(input,profile), b=bodyPerformanceTracks(input,profile);
    expect(a).toEqual(b);
    const events=a.find(t=>t.target==='body.gesture')!.keyframes.filter(k=>k.value!=='idle');
    for(let i=1;i<events.length;i++) expect(events[i].time-events[i-1].time).toBeGreaterThan(2.8);
    expect(bodyPerformanceTracks(input,{...profile,gestureFrequency:0})).toEqual([]);
  });
  it.each([['three things','counting','three'],["I don't know",'shrug',undefined],['पता नहीं','shrug',undefined],['మూడు','counting','three']])('directs %s semantically', (text,gesture,hand) => {
    expect(directBody(segment(text),0)).toMatchObject({gesture,handPose:hand});
  });
  it('gives all gesture clips finite eased numeric tracks, anticipation, and settle', () => {
    for(const gesture of gestures) {
      const tracks=bodyPerformanceTracks(plan([{...segment(),direction:{gesture}}]),profile);
      expect(tracks.flatMap(t=>t.keyframes).every(k=>Number.isFinite(k.time)&& (typeof k.value !== 'number'||Number.isFinite(k.value)))).toBe(true);
      if(gesture==='idle'||gesture==='turn-side'||gesture==='return-front'||gesture.includes('walk')||gesture==='step'||gesture==='run'||/^(enter|exit)-/.test(gesture)) continue;
      for(const track of tracks.filter(t=>t.valueType==='number')) { expect(Number(track.keyframes.at(-1)!.value)).toBeCloseTo(gesture==='sit-down' && track.target==='body.crouch' ? 160 : 0); expect(track.keyframes.every(k=>k.interpolation==='ease-in-out')).toBe(true); }
    }
  });
  it('uses manual overrides ahead of gestures irrespective of track order', () => {
    const tracks=bodyPerformanceTracks(plan([segment()]),profile), auto=tracks.find(t=>t.target==='body.handRX')!;
    const manual: AnimationTrack={...auto,id:'manual',layer:'manual',generated:false,keyframes:[{id:'m',time:0,value:12,source:'manual',interpolation:'hold'}]};
    expect(bodyState([manual,...tracks],1).handRX).toBe(12);
    const boneManual={...manual,target:'bone.torso.rotation',keyframes:[{...manual.keyframes[0],value:25}]};
    expect(bodyState([...tracks,boneManual],1).lean).toBe(0);
    expect(evaluateBones(createDefaultProject().rig.bones,[boneManual],1).find(b=>b.id==='torso')!.rotation).toBe(25);
  });
  it('stages adjacent view changes with the head leading the torso', () => {
    const tracks=bodyPerformanceTracks(plan([{...segment(),direction:{gesture:'confident',characterView:'back'}}]),profile);
    const head=tracks.find(t=>t.target==='body.headView')!, body=tracks.find(t=>t.target==='body.view')!;
    expect(head.keyframes.map(k=>k.value)).toEqual(['front','threeQuarterLeft','left','threeQuarterBackLeft','back']);
    expect(body.keyframes[1].time-head.keyframes[1].time).toBeCloseTo(.15);
  });
  it('preserves the first gesture and allows an idle directed turn', () => {
    const clips = bodyPerformanceTracks(plan([segment('Three things'), segment('You', 6)]), profile);
    expect(evaluateTrack(clips.find(t=>t.target==='body.gesture')!,0)).toBe('counting');
    const turn = bodyPerformanceTracks(plan([{...segment(),direction:{gesture:'idle',characterView:'left'}}]),profile);
    expect(evaluateTrack(turn.find(t=>t.target==='body.view')!,0)).toBe('front');
    expect(evaluateTrack(turn.find(t=>t.target==='body.view')!,1)).toBe('left');
  });
  it('limits inserted manual clips to their active time range', () => {
    const automatic = bodyPerformanceTracks(plan([segment()]),profile).find(t=>t.target==='body.lean')!;
    const manual: AnimationTrack = {...automatic,id:'manual',generated:false,layer:'manual',activeRange:[1,2],keyframes:[{...automatic.keyframes[0],time:1,value:7,source:'manual'}]};
    expect(evaluateTrack(manual,.5)).toBeUndefined();
    expect(bodyState([automatic,manual],1.5).lean).toBe(7);
    expect(evaluateTrack(manual,2.5)).toBeUndefined();
  });
  it('has separate original-reference view assets and the complete hand library', () => {
    for(const view of bodyViews) expect(existsSync(`assets/production_character/performance/${view}.svg`)).toBe(true);
    for(const pose of handPoses) expect(existsSync(`assets/production_character/performance/hands/${pose}.svg`)).toBe(true);
    expect(viewInfo('back').faceVisible).toBe(false);
    expect(viewInfo('threeQuarterBackRight').rear).toBe(true);
    expect(viewInfo('left').near).not.toBe(viewInfo('right').near);
    const catalog=JSON.parse(readFileSync('assets/production_character/performance/catalog.json','utf8'));
    expect(catalog.gestures).toEqual(gestures); expect(catalog.handPoses).toEqual(handPoses);
  });
  it('uses the same curved skin engine in both modes and preserves edited old pivots', () => {
    const project=createDefaultProject(), old={...project,rig:{...project.rig,bones:project.rig.bones.filter(b=>!b.id.includes('Pole')).map(b=>b.id==='head'?{...b,pivotX:777}:b)}};
    expect(upgradeBodyRig(old).rig.bones.find(b=>b.id==='head')!.pivotX).toBe(777);
    const tracks=bodyPerformanceTracks(plan([{...segment(),direction:{gesture:'folded-arms'}}]),profile), state=bodyState(tracks,1.4), bones=poseBody(project.rig.bones,state), world=calculateWorldMatrices(bones);
    for(const mode of ['stick','hoodie'] as const) {
      const svg=renderToStaticMarkup(createElement(BodyRig,{project:{...project,character:{...project.character,mode}},bones,world,state,time:1.4,pass:'front',resolveAssetUrl:u=>u}));
      expect(svg).toContain('stroke-linecap="round"'); if(mode==='hoodie') expect(svg).toContain('/hands/folded.svg'); else expect(svg).not.toContain('/hands/'); expect(svg).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('speech with emotion', () => {
  it('keeps phonetic opening while changing emotional corners', () => {
    const shapes=['happy','sad','angry','fear'].map(expression=>speechMouthGeometry({...defaultFace(),eyeExpression:expression as 'happy',jawOpen:.8},'AA'));
    expect(new Set(shapes.map(s=>s.path)).size).toBe(4);
    expect(shapes.every(s=>s.opening>10)).toBe(true);
    expect(speechMouthGeometry({...defaultFace(),jawOpen:1},'MBP').opening).toBeLessThan(1);
  });
  it('does not cycle arbitrary mouth artwork during playback', () => {
    for(let t=0;t<5;t+=.1) expect(resolveFacePreview(defaultFace(),t,true).mouth).toBe('REST');
  });
  it.each([['phone','en','FV'],['three','en','EEI'],['పల','te','MBP'],['पल','hi','MBP'],['moodu','te','MBP']] as const)('maps %s using context', (word,language,viseme) => {
    expect(pronunciationUnits(word,language).map(unit=>VisemeMapper.fromUnit(unit,language))).toContain(viseme);
  });
  it('preserves fast closures and L with ordered timing', () => {
    const raw=(['AA','MBP','L','FV','OH','OOW'] as const).map((viseme,i)=>({start:i*.035,end:(i+1)*.035,viseme,strength:.8,sourceText:viseme}));
    const result=new VisemeSequenceOptimizer().optimize(raw,transcriptFromText('a big laugh for you',.21),profile);
    expect(result.events.map(e=>e.viseme)).toEqual(expect.arrayContaining(['MBP','L','FV']));
    expect(result.events.length).toBeLessThan(raw.length);
    expect(result.events.every(e=>e.onset<=e.apex&&e.apex<=e.offset)).toBe(true);
  });
  it('hides the far eye in profile without scaling a front face', () => {
    const p=createDefaultProject();
    const front=renderToStaticMarkup(createElement(FaceRig,{face:p.character.face,calibration:p.character.calibration,view:'front',time:0,playing:false}));
    const side=renderToStaticMarkup(createElement(FaceRig,{face:p.character.face,calibration:p.character.calibration,view:'left',time:0,playing:false}));
    expect(front.match(/data-eye-root=/g)?.length).toBe(2); expect(side.match(/data-eye-root=/g)?.length).toBe(1);
  });
  it('evaluates real cubic-bezier x timing', () => {
    const track: AnimationTrack={id:'e',name:'e',target:'body.lean',layer:'gesture',valueType:'number',generated:true,muted:false,locked:false,keyframes:[{id:'a',time:0,value:0,source:'procedural',interpolation:'bezier',easing:{x1:.9,y1:0,x2:.95,y2:1}},{id:'b',time:1,value:1,source:'procedural',interpolation:'linear'}]};
    expect(evaluateTrack(track,.5)).toBeLessThan(.2);
  });
});
