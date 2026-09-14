import { validateLimb } from '../rig/PoseValidation';
import { applyToPoint, inverse, toSvgMatrix, type Matrix } from '../core/math/matrix';
import { evaluateTrack, orderedTracks } from '../animation/evaluate';
import { bodyManifests, profileBones, blendLimb, limbCurve, solveLimb, viewInfo, type BodyView, type HandPose } from '../rig/FullBody';
import type { AnimationTrack, Bone, ProjectDocument } from '../project/schema';

export function bodyState(tracks: AnimationTrack[], time: number) {
  const values: Record<string, number | string> = {};
  for (const track of orderedTracks(tracks)) if (track.target.startsWith('body.')) { const value = evaluateTrack(track, track.generated && !track.locked && track.layer === 'gesture' ? Math.floor(time*12)/12 : time); if (typeof value === 'number' || typeof value === 'string') values[track.target.slice(5)] = value; }
  for (const track of tracks) if (evaluateTrack(track,time) !== undefined && (track.layer === 'manual' || track.locked || track.keyframes.some(k => k.source === 'manual'))) {
    if (track.target.startsWith('bone.torso.')) values.lean = 0;
    if (track.target.startsWith('bone.hips.')) { values.shift = 0; values.crouch = 0; values.travel = 0; }
    const limb = track.target.match(/^bone\.(hand|wrist|upperArm|forearm|thigh|shin|foot|ankle)(L|R)\./);
    if (limb) { const label = `${['thigh','shin','foot','ankle'].includes(limb[1]) ? 'Leg' : 'Arm'}${limb[2]}`; values[`manual${label}`] = 1; if (track.target.endsWith('.rotation')) values[`fk${label}`] = 1; }
  }
  return values;
}
export function poseBody(bones: Bone[], state: Record<string, number | string>): Bone[] {
  const view = String(state.view ?? 'front');
  const travelSign = view.includes('Left') || view === 'left' ? -1 : 1;
  return bones.map(bone => bone.id === 'neck' ? {...bone,x:Math.max(-3,Math.min(3,bone.x)),y:Math.max(-3,Math.min(3,bone.y)),rotation:Math.max(-8,Math.min(8,bone.rotation))} : bone.locked ? bone : bone.id === 'hips' ? { ...bone, x: bone.x + Number(state.shift ?? 0) + Number(state.travel ?? 0) * travelSign, y: bone.y + Number(state.crouch ?? 0) } : bone.id === 'torso' ? { ...bone, rotation: bone.rotation + Number(state.lean ?? 0) } : bone.id.startsWith('clavicle') ? { ...bone, y: bone.y + Number(state.shoulder ?? 0) } : bone);
}

export function solveBodyLimb(project:ProjectDocument,bones:Bone[],world:Map<string,Matrix>,state:Record<string,number|string>,side:'L'|'R',leg:boolean) {
  const skin=bodyManifests[project.character.mode??'hoodie'], view=(state.view??project.character.view??'front') as BodyView, info=viewInfo(view);
  const perspective=info.side?.25:view.includes('Quarter')?.75:1;
  const bindBones=profileBones(project.rig.bones,project.character.mode??'hoodie');
  const startId=`${leg?'thigh':'upperArm'}${side}`,jointId=`${leg?'shin':'forearm'}${side}`,endId=`${leg?'foot':'hand'}${side}`;
    // Solve in the upper limb parent's coordinate system. One enclosing SVG
    // transform carries the skin, cuff and attachment together into world space.
    const sourceStart = bindBones.find(b => b.id === startId)!, sourceJoint = bindBones.find(b => b.id === jointId)!, base = bindBones.find(b => b.id === endId)!;
    const parent = world.get(sourceStart.parentId!)!, parentInverse = inverse(parent);
    const projectPoint = (p: {x:number;y:number}) => ({x:895+(p.x-895)*perspective,y:p.y});
    const localPoint = (id:string) => { const bone=bones.find(b=>b.id===id)!; return projectPoint(applyToPoint(parentInverse,applyToPoint(world.get(id)!,{x:bone.pivotX,y:bone.pivotY}))); };
    const start = projectPoint({x:sourceStart.pivotX,y:sourceStart.pivotY}), joint=localPoint(jointId), fkEnd=localPoint(endId);
    const animatedEnd = bones.find(b => b.id === endId)!;
    const motion=skin.motionScale;
    let target = leg ? applyToPoint(parentInverse, applyToPoint(world.get('root')!, {x:895+(base.pivotX-895)*perspective+animatedEnd.x+Number(state[`foot${side}X`]??0)*(view.includes('Left') || view==='left'?-1:1),y:base.pivotY+animatedEnd.y+Number(state[`foot${side}Y`]??0)})) : {x:fkEnd.x+Number(state[`hand${side}X`]??0)*motion,y:fkEnd.y+Number(state[`hand${side}Y`]??0)*motion};
    const contactArm=!leg && side==='R' && !state.manualArmR && ['thinking','hand-on-chin','facepalm'].includes(String(state.gesture));
    // The upper arm points toward camera in chin poses: shorten its projection,
    // not the physical forearm, and ease depth with the authored contact channel.
    const projection=contactArm ? 1-.45*Math.max(0,Math.min(1,Number(state.contactWeight??0))) : 1;
    const upper=projection*Math.hypot(sourceJoint.pivotX-sourceStart.pivotX,sourceJoint.pivotY-sourceStart.pivotY), lower=Math.hypot(base.pivotX-sourceJoint.pivotX,base.pivotY-sourceJoint.pivotY);
    const poleBone=bones.find(b=>b.id===`${leg?'knee':'elbow'}Pole${side}`);
    const pole={x:start.x+(leg&&info.side?info.direction:side==='L'?1:-1)*(leg?140:170)+(poleBone?.x??0),y:start.y+(leg?140:160)+(poleBone?.y??0)};
    const manual=state[`manual${leg?'Leg':'Arm'}${side}`] || animatedEnd.locked;
    if (!leg && side==='R' && ['thinking','hand-on-chin','facepalm'].includes(String(state.gesture))) {
      const anchor=applyToPoint(parentInverse,applyToPoint(world.get('head')!,{x:skin.id==='stick'?850:878,y:state.gesture==='facepalm'?205:skin.id==='stick'?253:280}));
      const weight=Math.max(0,Math.min(1,Number(state.contactWeight??Math.min(1,Math.abs(Number(state.handRY??0))/231))));
      target={x:fkEnd.x+(anchor.x-fkEnd.x)*weight,y:fkEnd.y+(anchor.y-fkEnd.y)*weight};
    }
    if(!leg && !manual && !['thinking','hand-on-chin','facepalm','folded-arms','hands-on-hips'].includes(String(state.gesture))) {
      // Continuous, stateless projection to the face exclusion ellipse. Intentional
      // contact clips supply a head-relative anchor and bypass this constraint.
      const center=applyToPoint(parentInverse,applyToPoint(world.get('head')!,{x:895,y:150}));
      const dx=target.x-center.x,dy=target.y-center.y,r=Math.hypot(dx/115,dy/125);
      if(r<1 && r>.001) target={x:center.x+dx/r,y:center.y+dy/r};
    }
    if(manual) target=fkEnd;
    let solved=state[`fk${leg?'Leg':'Arm'}${side}`] ? {start,joint,end:fkEnd} : solveLimb(start,target,upper,lower,pole,{softness:leg?0:5,minBend:leg?0:5,maxBend:155,bendDirection:leg||String(state.gesture).includes('walk')||state.gesture==='run'?undefined:side==='R'&&['thinking','hand-on-chin','facepalm','hands-on-hips'].includes(String(state.gesture))?1:state.gesture==='hands-on-hips'?-1:side==='L'?1:-1});
    if(!leg && !manual && state.gesture!=='folded-arms' && (contactArm || solved.joint.y>start.y)) {
      // Contact targets cannot pull the elbow across the chest. Limit shoulder
      // adduction, then solve the forearm from that elbow without stretching.
      const inward=side==='R'?1:-1;
      if ((solved.joint.x-start.x)*inward > -upper*.15) {
        const elbow={x:start.x+-inward*upper*.15,y:start.y+upper*Math.sqrt(1-.15*.15)};
        const angle=Math.atan2(target.y-elbow.y,target.x-elbow.x);
        solved={start,joint:elbow,end:{x:elbow.x+Math.cos(angle)*lower,y:elbow.y+Math.sin(angle)*lower},clamped:true};
      }
    }
    const pocketTarget=applyToPoint(parentInverse,applyToPoint(world.get('torso')!,{x:side==='R'?850:940,y:510}));
    const pocketRest=skin.id==='hoodie' && view==='front' && !leg && !manual;
    if(!leg && !manual) {
      const rest=solveLimb(start,pocketRest?pocketTarget:fkEnd,upper,lower,pole);
      solved=blendLimb(rest,solved,pocketRest && !contactArm && !Number(state[`hand${side}X`]??0) && !Number(state[`hand${side}Y`]??0) ? 0 : Number(state.poseWeight??(Math.abs(Number(state.handLX??0))+Math.abs(Number(state.handLY??0))+Math.abs(Number(state.handRX??0))+Math.abs(Number(state.handRY??0))>0?1:0)));
    }
    const ikBlend=Number(state[`ik${leg?'Leg':'Arm'}${side}`]??1);
    if(ikBlend<1 && !manual) solved=blendLimb({start,joint,end:fkEnd},solved,ikBlend);
    if (!leg && !manual && state.gesture === 'folded-arms') {
      const weight=Number(state.contactWeight??Math.min(1,Math.abs(Number(state.handLX??0))/145)), sign=side==='R'?1:-1;
      const restUpper=Math.atan2(sourceJoint.pivotY-sourceStart.pivotY,sourceJoint.pivotX-sourceStart.pivotX);
      const upperAngle=restUpper+((90+sign*10)*Math.PI/180-restUpper)*weight;
      const lowerAngle=(90-sign*105*weight)*Math.PI/180;
      const elbow={x:start.x+Math.cos(upperAngle)*upper,y:start.y+Math.sin(upperAngle)*upper};
      solved={start,joint:elbow,end:{x:elbow.x+Math.cos(lowerAngle)*lower,y:elbow.y+Math.sin(lowerAngle)*lower},clamped:false};
    }

  return {parent,start,target,pole,solved,upper,lower,animatedEnd,pocketed:pocketRest && Math.hypot(solved.end.x-pocketTarget.x,solved.end.y-pocketTarget.y)<24};
}

export function BodyRig({ project, bones, world, state, time, pass, resolveAssetUrl, debug = false, onTargetDrag }: { project: ProjectDocument; bones: Bone[]; world: Map<string, Matrix>; state: Record<string, number | string>; time: number; pass: 'back' | 'front'; resolveAssetUrl(url: string): string; debug?: boolean; onTargetDrag?(event: React.PointerEvent, boneId: string): void }) {
  const skin = bodyManifests[project.character.mode ?? 'hoodie'], view = (state.view ?? project.character.view ?? 'front') as BodyView, info = viewInfo(view);
  const headTransform = world.get('head'), headView = (state.headView ?? view) as BodyView;
  const limb = (side: 'L' | 'R', leg: boolean) => {
    const startId = `${leg ? 'thigh' : 'upperArm'}${side}`, jointId = `${leg ? 'shin' : 'forearm'}${side}`, endId = `${leg ? 'foot' : 'hand'}${side}`;
    if (!bones.some(b => b.id === startId) || bones.find(b => b.id === startId)?.visible === false) return null;
    const {parent,start,target,pole,solved,upper,lower,animatedEnd,pocketed}=solveBodyLimb(project,bones,world,state,side,leg);
    const curve=limbCurve(start,solved.joint,solved.end,true);
    const width = leg ? skin.legWidth : skin.armWidth, color = leg ? skin.legColor : skin.armColor;
    const rotation = Math.atan2(solved.end.y - solved.joint.y, solved.end.x - solved.joint.x) * 180 / Math.PI - 90 + Number(state[`wrist${side}`] ?? 0) + animatedEnd.rotation + (bones.find(b => b.id === `wrist${side}`)?.rotation ?? 0);
    const hand = (state[`hand${side}Pose`] ?? 'relaxed') as HandPose;
    return <g key={startId} data-rig-node={startId} data-pose-issues={validateLimb(solved,start,upper,lower).join(",")} transform={toSvgMatrix(parent)}>
      <path d={curve.path} fill="none" stroke={skin.outline} strokeWidth={width + (skin.id === 'hoodie' ? 5 : 0)} strokeLinecap={skin.id === 'hoodie' && !leg ? 'butt' : 'round'} strokeLinejoin="round" />
      <path d={curve.path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {skin.id === 'hoodie' && (leg ? <g transform={`translate(${solved.end.x} ${solved.end.y})`}><path d="M -25 -8 Q -32 7 -32 16 Q -10 25 33 15 L 32 4 Q 12 -10 -25 -8" fill={skin.id === 'hoodie' ? '#181820' : '#111'} stroke="#111" strokeWidth="3" /></g> : <g transform={`translate(${solved.end.x} ${solved.end.y}) rotate(${rotation}) scale(${side === 'L' ? -1 : 1} 1)`}>
        {!pocketed && <image href={resolveAssetUrl(`/production_character/performance/hands/${hand}.svg`)} x={-32*skin.handScale} y={-2*skin.handScale-6} width={64*skin.handScale} height={78*skin.handScale} />}
        <path d="M -24 -14 Q 0 -18 24 -14 L 22 7 Q 0 11 -22 7 Z" fill="#ba0000" stroke="#181818" strokeWidth="3" />
        {pocketed && <path data-pocket-cover={side} d="M -27 1 Q 0 10 27 1 L 27 27 L -27 27 Z" fill="#e60000" stroke="none"/>}
        {pocketed && <path d="M -27 1 Q 0 10 27 1" fill="none" stroke="#181818" strokeWidth="3"/>}
      </g>)}
      {debug && <g className="body-debug" fill="none" stroke="#17bda7" strokeWidth="2"><circle fill="transparent" style={{cursor:'grab'}} onPointerDown={event => onTargetDrag?.(event,endId)} cx={target.x} cy={target.y} r="14" /><circle fill="transparent" style={{cursor:'grab'}} onPointerDown={event => onTargetDrag?.(event,`${leg ? 'knee' : 'elbow'}Pole${side}`)} cx={solved.joint.x} cy={solved.joint.y} r="9" /><circle cx={pole.x} cy={pole.y} r="6" stroke="#ee9900"/><path pointerEvents="none" d={`M ${start.x} ${start.y} L ${solved.joint.x} ${solved.joint.y} L ${solved.end.x} ${solved.end.y}`} /></g>}
    </g>;
  };
  const front = view === 'front', far = info.near === 'L' ? 'R' : 'L';
  return <g className={`body-${pass}`}>
    {pass === 'back' && <>
      {(['L','R'] as const).map(side=>{
        const socket=(skin.pivots as Record<string,number[]>)[`upperArm${side}`], torso=world.get('torso')!, clavicle=world.get(`clavicle${side}`)!;
        const tip=applyToPoint(inverse(torso),applyToPoint(clavicle,{x:socket[0],y:socket[1]}));
        const projection=info.side?.25:view.includes('Quarter')?.75:1;
        return <g key={side} transform={toSvgMatrix(torso)} data-attachment={`shoulder${side}`}><path d={`M ${895+(socket[0]-895)*projection} ${socket[1]} L ${895+(tip.x-895)*projection} ${tip.y}`} stroke={skin.armColor} strokeWidth={skin.armWidth} strokeLinecap="round"/></g>;
      })}

      <g transform={toSvgMatrix(world.get('torso')!)}><path d={`M 875 310 L 875 270 Q 875 250 885 241 L 907 241 Q 918 255 915 273 L 915 310 Z`} fill={skin.skin} stroke={skin.outline} strokeWidth="3" /></g>{limb(far, true)}{limb(info.near, true)}{!front && limb(far, false)}{info.rear && limb(info.near, false)}</>}
    {pass === 'front' && <>
      {skin.id === 'stick' && <g transform={toSvgMatrix(world.get('torso')!)}>{front ? <image href={resolveAssetUrl('/production_character/performance/stick-shirt.svg')} x="803" y="290" width="190" height="300" preserveAspectRatio="none" /> : <><path d={info.side ? 'M 856 293 Q 890 278 930 296 L 940 588 L 844 588 Z' : 'M 821 294 Q 895 278 964 294 L 975 588 L 810 588 Z'} fill="#e60000" stroke="#231f20" strokeWidth="4" /><path d={info.side ? 'M 859 300 L 850 580 L 879 580 L 886 294 Z' : 'M 826 300 L 819 580 L 846 580 L 856 290 Z'} fill="#ba0000" /></>}</g>}
      {!front && skin.id === 'hoodie' && <g transform={toSvgMatrix(world.get('torso')!)}>
        <path d={info.side ? 'M 849 285 Q 914 262 936 323 L 944 576 Q 891 589 852 575 L 840 337 Z' : 'M 807 308 Q 892 255 979 307 L 984 575 Q 895 597 805 575 Z'} fill="#e60000" stroke="#181818" strokeWidth="4" />
        <path d={info.rear ? 'M 822 295 Q 896 373 965 295 Q 896 241 822 295 Z' : 'M 850 286 Q 898 329 932 300'} fill="#ba0000" stroke="#181818" strokeWidth="4" />
      </g>}
      {front && limb(far, false)}{!info.rear && limb(info.near, false)}
      {headView !== 'front' && <g transform={headTransform ? toSvgMatrix(headTransform) : undefined}><image href={resolveAssetUrl(`/production_character/performance/${headView}.svg`)} x="775" y="42" width="245" height="238" preserveAspectRatio="none" /></g>}
      {state.debug && <g className="body-debug" pointerEvents="none" transform={toSvgMatrix(world.get('torso')!)} fill="none" stroke="#cf3c99" strokeWidth="2">
        {String(state.debug).includes('Collision') && <><rect x="840" y="330" width="110" height="220"/><ellipse cx="895" cy="150" rx="115" ry="125"/></>}
        {String(state.debug).includes('Neck') && <rect x="873" y="270" width="45" height="38" fill="#44d5b8" fillOpacity=".3"/>}
        {String(state.debug).includes('Artwork') && <rect x="775" y="42" width="260" height="866" strokeDasharray="8 5"/>}
        {String(state.debug).includes('Attachment') && (['L','R'] as const).map(side=><circle key={side} cx={skin.pivots[`upperArm${side}`][0]} cy={skin.pivots[`upperArm${side}`][1]} r="8"/>)}
        {String(state.debug).includes('Z-order') && <text x="700" y="610" fill="#cf3c99" stroke="none" fontSize="18">{state.gesture==='folded-arms'?'R forearm → L forearm':`${far} arm → torso → ${info.near} arm`}</text>}
      </g>}

    </>}
  </g>;
}
