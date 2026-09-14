import type { AnimationTrack, CharacterPerformanceProfile, PerformancePlan, PerformanceSegment, TimedTranscript } from '../project/schema';
import { bodyViews, walkingFoot, type BodyView, type HandPose } from '../rig/FullBody';

export const gestures = ['idle', 'explain-left', 'explain-right', 'explain-both', 'point-left', 'point-right', 'point-up', 'point-down', 'raise-hand', 'shrug', 'disagree', 'confident', 'angry-emphasis', 'excited', 'confused', 'thinking', 'folded-arms', 'hands-on-hips', 'hand-on-chin', 'wave', 'counting', 'small-beat', 'large-beat', 'lean-forward', 'lean-back', 'weight-shift', 'step', 'walk', 'slow-walk', 'confident-walk', 'sad-walk', 'crouch', 'sit', 'idle-listening', 'idle-tired', 'talking-calm', 'talking-energetic', 'thumbs-up', 'facepalm', 'shock-recoil', 'sad-posture', 'crying-posture', 'laughing', 'celebration', 'run', 'sit-down', 'stand-up', 'enter-left', 'enter-right', 'exit-left', 'exit-right', 'turn-side', 'return-front'] as const;
export type Gesture = typeof gestures[number];
export interface BodyDirection { gesture: Gesture; gestureSide?: 'L' | 'R' | 'both'; handPose?: HandPose; bodyLean?: number; weightShift?: number; shoulderPose?: number; headDirection?: number; characterView?: BodyView; intensity?: number }
type Pose = { L?: [number, number]; R?: [number, number]; hand?: HandPose; lean?: number; shift?: number; shoulder?: number; crouch?: number };
// Wrist offsets in bind space, shared by both skins. Character left is screen right.
export const gesturePoses: Record<Gesture, Pose> = {
  idle: {}, 'explain-left': { L: [90, -140], hand: 'palm-up', lean: -2 }, 'explain-right': { R: [-90, -140], hand: 'palm-up', lean: 2 },
  'explain-both': { L: [75, -120], R: [-65, -140], hand: 'palm-up' },
  'point-left': { R: [-165, -195], hand: 'pointing', lean: 3 }, 'point-right': { L: [165, -180], hand: 'pointing', lean: -3 },
  'point-up': { L: [0, -380], hand: 'pointing', shoulder: -8 }, 'point-down': { R: [-80, -15], hand: 'pointing', lean: 4 },
  'raise-hand': { L: [30, -375], hand: 'open', shoulder: -8 }, shrug: { L: [55, -170], R: [-55, -165], hand: 'palm-up', shoulder: -15 },
  disagree: { R: [-70, -185], hand: 'open', lean: -3 }, confident: { L: [-12, -20], R: [12, -25], hand: 'fist', shift: 16 },
  'angry-emphasis': { R: [-55, -165], hand: 'fist', lean: 6 }, excited: { L: [60, -285], R: [-45, -270], hand: 'open', shoulder: -10 },
  confused: { L: [35, -140], hand: 'half-open', lean: -3 }, thinking: { R: [77, -231], hand: 'thinking', lean: 1 },
  'folded-arms': { L: [-145, -125], R: [140, -110], hand: 'folded', shoulder: -4 },
  'hands-on-hips': { L: [-25, -65], R: [25, -70], hand: 'folded', shift: 12 }, 'hand-on-chin': { R: [80, -235], hand: 'fist' },
  wave: { L: [65, -390], hand: 'waving', shoulder: -5 }, counting: { R: [-50, -200], hand: 'three' },
  'small-beat': { R: [-35, -85], hand: 'half-open', lean: 2 }, 'large-beat': { L: [70, -170], hand: 'open', lean: 5 },
  'lean-forward': { lean: 7 }, 'lean-back': { lean: -6 }, 'weight-shift': { shift: 22 }, step: { shift: 32 },
  crouch: { crouch: 115, L: [25, 0], R: [-25, 0] }, sit: { crouch: 160, L: [-15, 20], R: [15, 20] },
  'idle-listening': {lean:1,shift:6},
  'idle-tired': {lean:3,shoulder:8},
  'talking-calm': {R:[-25,-65],hand:'half-open',lean:1},
  'talking-energetic': {L:[60,-160],R:[-40,-110],hand:'open',lean:4},
  'thumbs-up': {R:[-65,-165],hand:'thumbs-up'},
  'facepalm': {R:[90,-290],hand:'facepalm',lean:3},
  'shock-recoil': {L:[40,-150],R:[-35,-135],hand:'panic',lean:-7},
  'sad-posture': {shoulder:10,lean:4,shift:12},
  'crying-posture': {R:[75,-260],hand:'half-open',lean:5,shoulder:10},
  'laughing': {L:[-70,-80],hand:'relaxed',lean:-5},
  'celebration': {L:[30,-340],R:[-25,-330],hand:'fist',shoulder:-8},
  'run': {},
  'sit-down': {crouch:160,L:[-15,20],R:[15,20]},
  'stand-up': {crouch:160},
  'enter-left': {},
  'enter-right': {},
  'exit-left': {},
  'exit-right': {},
  'turn-side': {shift:12},
  'return-front': {shift:-8},
  walk: {}, 'slow-walk': {}, 'confident-walk': {}, 'sad-walk': {},
};

export function directBody(segment: PerformanceSegment, index: number): BodyDirection {
  if (segment.direction) return segment.direction;
  const text = segment.text.toLowerCase(), emotion = segment.emotion.primary;
  let gesture: Gesture = 'idle', handPose: HandPose | undefined;
  if (/don't know|do not know|pata nahi|पता नहीं|తెలియదు/.test(text)) gesture = 'shrug';
  else if (/\b(three|3|teen|moodu)\b|तीन|మూడు/.test(text)) { gesture = 'counting'; handPose = 'three'; }
  else if (/\b(two|2|do|rendu) things\b|दो चीज|రెండు/.test(text)) { gesture = 'counting'; handPose = 'two'; }
  else if (/\b(first|one thing|ek|okati)\b/.test(text)) { gesture = 'counting'; handPose = 'one'; }
  else if (segment.intent === 'greeting' || /\b(hello|hi|namaste)\b/.test(text)) gesture = 'wave';
  else if (segment.intent === 'sarcasm' || emotion === 'suspicious') gesture = 'folded-arms';
  else if (emotion === 'sad' || emotion === 'tired') gesture = 'weight-shift';
  else if (emotion === 'thinking' || segment.intent === 'thinking') gesture = 'thinking';
  else if (segment.intent === 'disagreement' || /\b(no|never|nahi)\b/.test(text)) gesture = 'disagree';
  else if (emotion === 'angry' || emotion === 'frustrated') gesture = 'angry-emphasis';
  else if (emotion === 'excited') gesture = 'excited';
  else if (emotion === 'confused' || segment.intent === 'question') gesture = 'confused';
  else if (/\byou\b/.test(text)) gesture = index % 2 ? 'point-left' : 'point-right';
  else if (segment.intent === 'explanation') gesture = index % 2 ? 'explain-left' : 'explain-right';
  else if (segment.accents.some(a => a.importance > .65)) gesture = 'small-beat';
  else if (text.trim().split(/\s+/).length>=6) gesture = index%2?'explain-left':'explain-right';
  return { gesture, handPose, intensity: segment.emotion.intensity, shoulderPose: emotion === 'sad' || emotion === 'tired' ? 9 : undefined };
}

export function bodyPerformanceTracks(plan: PerformancePlan, profile: CharacterPerformanceProfile, transcript?: TimedTranscript): AnimationTrack[] {
  const tracks = new Map<string, AnimationTrack>();
  const strength = (profile.fullBodyStrength ?? 1) * (profile.gestureStrength ?? .85), frequency = profile.gestureFrequency ?? .45;
  let available = 0, previous: Gesture = 'idle', currentView: BodyView = 'front';
  const add = (target: string, time: number, value: number | string) => {
    let track = tracks.get(target);
    if (!track) { track = { id: `auto-body-${target}`, name: `Body · ${target.replace('body.', '')}`, layer: 'gesture', target, valueType: typeof value === 'number' ? 'number' : 'string', generated: true, muted: false, locked: false, keyframes: [] }; tracks.set(target, track); }
    track.keyframes.push({ id: `${target}-${track.keyframes.length}`, time, value, source: 'rule-performance', interpolation: typeof value === 'number' ? 'ease-in-out' : 'hold' });
  };
  const segments=plan.segments.flatMap(segment=>{
    if(!transcript || (segment.direction && !['idle','explain-left','explain-right','explain-both','small-beat','large-beat'].includes(segment.direction.gesture)) || segment.end-segment.start<6) return [segment];
    const words=transcript.segments.flatMap(s=>s.words).filter(w=>w.start>=segment.start && w.start<segment.end);
    if(!words.length) return [segment];
    const phrases:PerformanceSegment[]=[];
    for(const word of words) {
      const phrase=phrases.at(-1);
      if(!phrase || word.start-phrase.start>=4.5) phrases.push({...segment,direction:undefined,id:`${segment.id}-body-${phrases.length}`,start:word.start,end:word.end,text:word.text});
      else { phrase.end=word.end; phrase.text+=' '+word.text; }
    }
    return phrases;
  });
  segments.forEach((originalSegment, index) => {
    // A cooldown ending mid-sentence must not discard the entire next sentence.
    const segment={...originalSegment,start:Math.max(originalSegment.start,available)};
    if (strength <= 0 || frequency <= 0 || segment.start < available || segment.end - segment.start < .65) return;
    const direction = {...directBody(segment, index)};
    if(direction.gesture==='turn-side') direction.characterView='threeQuarterLeft';
    if(direction.gesture==='return-front') direction.characterView='front';
    if (direction.characterView && direction.characterView !== currentView) {
      if (!tracks.has('body.headView')) { add('body.headView', 0, 'front'); add('body.view', 0, 'front'); }
      let from = bodyViews.indexOf(currentView), to = bodyViews.indexOf(direction.characterView), delta = (to-from+8)%8;
      const sign = delta > 4 ? -1 : 1, steps = Math.min(delta,8-delta);
      for (let step=1; step<=steps; step++) { const view = bodyViews[(from+sign*step+8)%8]; add('body.headView', segment.start + step*.12, view); add('body.view', segment.start + step*.12+.15, view); }
      if(!tracks.has('body.turnBlink')) add('body.turnBlink',0,0);
      add('body.turnBlink',segment.start,0); add('body.turnBlink',segment.start+.08,1); add('body.turnBlink',segment.start+steps*.12+.12,1); add('body.turnBlink',segment.start+steps*.12+.24,0);
      currentView = direction.characterView;
    }
    let gesture = direction.gesture;
    if(index===0 && !segment.direction && /\b(sitting|seated)\b/i.test(profile.sceneDescription??'')) gesture='sit-down';
    add('body.shotSuggestion',segment.start,gesture.includes('walk')||gesture==='run'||/^(enter|exit)-/.test(gesture)?'full-body':gesture==='thinking'?'medium-close':'medium');
    if (gesture === 'idle') return;
    if (gesture === previous && !segment.direction) gesture = gesture.startsWith('explain') ? (gesture === 'explain-left' ? 'explain-right' : 'explain-left') : 'small-beat';
    const pose = gesturePoses[gesture], start = segment.start, duration = Math.min(segment.end - start, gesture === 'thinking' || gesture === 'folded-arms' ? 3.2 : 2.2);
    if (gesture.includes('walk') || gesture === 'step' || gesture === 'run' || /^(enter|exit)-/.test(gesture)) {
      const speed = gesture === 'slow-walk' || gesture === 'sad-walk' ? .65 : gesture === 'run' ? 1.7 : 1, stride = gesture === 'confident-walk' || gesture==='run' ? 110 : 85;
      const length = gesture === 'step' ? 1 / speed : Math.min(4, segment.end-start);
      add('body.gesture',start,gesture);
      const cycles=Math.max(1,Math.round(length*speed)), ramp=Math.min(.3,length*.2);
      const directionSign=(gesture==='enter-right'||gesture==='exit-left')?-1:1;
      const travelBase=Number(tracks.get('body.travel')?.keyframes.at(-1)?.value??0)-(gesture.startsWith('enter-')?cycles*stride*directionSign:0);
      const distanceAt=(t:number):number=>t<ramp ? t/2-ramp*Math.sin(Math.PI*t/ramp)/(2*Math.PI) : t>length-ramp ? length-ramp-distanceAt(length-t) : t-ramp/2;
      for (let frame=0; frame<=Math.ceil(length*30); frame++) {
        const t = Math.min(length, frame/30), phase=distanceAt(t)/(length-ramp)*cycles, travel = travelBase+phase*stride*directionSign, envelope=Math.min(1,t/ramp,(length-t)/ramp);
        add('body.poseWeight',start+t,envelope); add('body.travel', start+t, travel); add('body.crouch', start+t, (9 + Math.sin(phase*Math.PI*4)*3)*envelope);
        add('body.lean', start+t, gesture==='run'?6:gesture === 'sad-walk' ? 4 : gesture === 'confident-walk' ? -2 : 0);
        for (const side of ['L','R'] as const) { const foot = walkingFoot(phase, side, 1, stride,gesture==='run'?{stance:.38,lift:70}:{}); add(`body.foot${side}X`, start+t, travelBase+foot.x*directionSign); add(`body.foot${side}Y`, start+t, foot.y); add(`body.hand${side}X`, start+t, Math.sin(phase*Math.PI*2+(side==='L'?0:Math.PI))*(gesture==='run'?50:25)*envelope); }
      }
      add('body.gesture',start+length,'idle');
      available = start + length + 1; previous = gesture; return;
    }
    const intensity = ['folded-arms','hands-on-hips','thinking','hand-on-chin','sit-down','stand-up'].includes(gesture) ? Math.min(1, strength / .85) : strength * (.65 + Math.max(0, Math.min(1, direction.intensity ?? .5)) * .35);
    const values: Record<string, number> = { poseWeight: 1, contactWeight: ['folded-arms','thinking','hand-on-chin','facepalm'].includes(gesture) ? 1 : 0, lean: direction.bodyLean ?? pose.lean ?? 0, shift: direction.weightShift ?? pose.shift ?? 0, shoulder: direction.shoulderPose ?? pose.shoulder ?? 0, crouch: pose.crouch ?? 0 };
    if(pose.crouch===undefined) delete values.crouch;
    for (const side of ['L', 'R'] as const) {
      const position = direction.gestureSide && direction.gestureSide !== 'both' ? (side === direction.gestureSide ? pose.L ?? pose.R : undefined) : pose[side];
      values[`hand${side}X`] = position?.[0] ?? 0; values[`hand${side}Y`] = position?.[1] ?? 0;
      if (!tracks.has(`body.hand${side}Pose`)) add(`body.hand${side}Pose`, 0, 'relaxed'); add(`body.hand${side}Pose`, start + duration * .18, position ? direction.handPose ?? pose.hand ?? 'relaxed' : 'relaxed');
      add(`body.hand${side}Pose`, start + duration * .94, 'relaxed');
      values[`wrist${side}`] = gesture === 'wave' && side === 'L' ? 22 : 0;
    }
    for (const [property, amount] of Object.entries(values)) {
      if (!tracks.has(`body.${property}`)) add(`body.${property}`, 0, 0);
      const phases = property==='crouch' && gesture==='stand-up' ? [[0,1],[.12,1.02],[.4,.5],[.76,0],[1,0]] : property==='crouch' && gesture==='sit-down' ? [[0,0],[.12,-.04],[.4,.65],[.76,1],[1,1]] : gesture === 'wave' && property === 'wristL' ? [[0,0],[.12,-.08],[.38,-1],[.48,1],[.56,-1],[.64,1],[.76,0],[1,0]] : [[0,0],[.12,-.08],[.26,.6],[.4,1],[.64,1],[.76,1.045],[1,0]];
      for (const [phase, scale] of phases) {
        const lag = property.startsWith('hand') && phase>0 && phase<1 ? .035 : 0;
        const arc = property.startsWith('hand') && property.endsWith('Y') && amount !== 0 && phase === .26 ? -14*intensity : 0;
        add(`body.${property}`, start + duration * phase + lag, amount * (['contactWeight','poseWeight'].includes(property) ? 1 : intensity) * scale + arc);
      }
    }
    if (direction.headDirection) for (const [phase,scale] of [[0,0],[.3,1],[.75,1],[1,0]]) add('bone.head.rotation', start+duration*phase, direction.headDirection*scale);
    if (!tracks.has('body.gesture')) add('body.gesture', 0, 'idle'); add('body.gesture', start, gesture); add('body.gesture', start + duration, 'idle');
    available = start + duration + .35 + (1 - frequency) * 1.2; previous = gesture;
  });
  return [...tracks.values()].map(track => ({ ...track, keyframes: [...new Map(track.keyframes.map(key => [key.time, key])).values()].sort((a,b) => a.time-b.time) }));
}

/** Shared clip contract consumed by the editor, planner and QA tooling. */
export const clipDefinitions = Object.fromEntries(gestures.map(gesture=>[gesture,{
  gesture, anticipation:[0,.12], action:[.12,.4], contact:[.4,.64], release:[.76,1], settle:1,
  blendIn:.12, blendOut:.24, channelMask:['body'], variants:['hoodie','stick'], views:bodyViews,
  handPose:gesturePoses[gesture].hand??'relaxed', contactExclusions:['folded-arms','thinking','hand-on-chin','facepalm','hands-on-hips'].includes(gesture)?['hand-torso','hand-face','arm-arm']:[],
  zOrder:gesture==='folded-arms'?['armR','armL']:['far-arm','torso','near-arm']
}]));
