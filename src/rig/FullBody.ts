import type { Bone } from '../project/schema';
import type { Point } from '../core/math/matrix';
import hoodie from '../character/manifests/hoodie.json';
import stick from '../character/manifests/stick.json';

export const bodyViews = ['front', 'threeQuarterLeft', 'left', 'threeQuarterBackLeft', 'back', 'threeQuarterBackRight', 'right', 'threeQuarterRight'] as const;
export type BodyView = typeof bodyViews[number];
export const bodyManifests = { hoodie, stick };
export const handPoses = ['relaxed', 'open', 'half-open', 'fist', 'pointing', 'thumbs-up', 'one', 'two', 'three', 'palm-up', 'thinking', 'folded', 'gripping', 'waving', 'stop', 'facepalm', 'phone-grip', 'object-grip', 'controller-grip', 'hips', 'panic'] as const;
export type HandPose = typeof handPoses[number];
export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
export const mixPoint = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Analytic two-bone solve. A stable pole side avoids flipping at full extension. */
export function solveLimb(start: Point, target: Point, upper: number, lower: number, pole: Point, options: { softness?: number; minBend?: number; maxBend?: number; bendDirection?: -1 | 1 } = {}) {
  if (![start.x, start.y, target.x, target.y, upper, lower, pole.x, pole.y].every(Number.isFinite) || upper <= 0 || lower <= 0) throw new Error('Invalid IK inputs');
  const raw = distance(start, target);
  const reachAtBend=(degrees:number)=>Math.sqrt(upper*upper+lower*lower+2*upper*lower*Math.cos(degrees*Math.PI/180));
  const maximum=Math.min(upper+lower-.001,reachAtBend(options.minBend??0)), minimum=Math.max(Math.abs(upper-lower)+.001,reachAtBend(options.maxBend??180));
  const soft=Math.max(0,Math.min(maximum*.2,options.softness??0)), threshold=maximum-soft;
  const softened=soft>0 && raw>threshold ? threshold+soft*(1-Math.exp(-(raw-threshold)/soft)) : raw;
  const length=Math.max(minimum,Math.min(maximum,softened));
  const dx = raw > .001 ? (target.x - start.x) / raw : 0, dy = raw > .001 ? (target.y - start.y) / raw : 1;
  const along = (upper * upper - lower * lower + length * length) / (2 * length);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const side = options.bendDirection ?? (dx * (pole.y - start.y) - dy * (pole.x - start.x) < 0 ? -1 : 1);
  return { start, joint: { x: start.x + dx * along - dy * height * side, y: start.y + dy * along + dx * height * side }, end: { x: start.x + dx * length, y: start.y + dy * length }, clamped: Math.abs(raw - length) > .01 };
}

/** Two cubics share both endpoint and derivative at the joint (C1 continuity). */
export function limbCurve(a: Point, b: Point, c: Point, angular = false) {
  const span = Math.max(.001, distance(a, c)), radius = Math.min(distance(a, b), distance(b, c)) * .48;
  const tangent = { x: (c.x - a.x) / span * radius, y: (c.y - a.y) / span * radius };
  const controls = [mixPoint(a, b, .55), { x: b.x - tangent.x, y: b.y - tangent.y }, { x: b.x + tangent.x, y: b.y + tangent.y }, mixPoint(c, b, .55)];
  const p = (v: Point) => `${v.x.toFixed(3)} ${v.y.toFixed(3)}`;
  return { controls, path: angular ? `M ${p(a)} L ${p(b)} L ${p(c)}` : `M ${p(a)} C ${p(controls[0])} ${p(controls[1])} ${p(b)} C ${p(controls[2])} ${p(controls[3])} ${p(c)}` };
}

/** Stance remains in world space; only the swing phase moves the foot. No frame history. */
export function walkingFoot(time: number, side: 'L' | 'R', speed = 1, stride = 110, options: {stance?:number;lift?:number} = {}) {
  const cycle = time * speed + (side === 'L' ? .5 : 0), index = Math.floor(cycle), phase = cycle - index;
  const stance = options.stance ?? .62, t = Math.max(0, (phase - stance) / (1 - stance)), eased = t * t * (3 - 2 * t);
  return { x: (index + eased) * stride, y: -Math.sin(Math.PI * t) * (options.lift??42), planted: phase < stance };
}

export function viewInfo(view: BodyView) {
  const index = bodyViews.indexOf(view), rear = index >= 3 && index <= 5;
  return { rear, side: view === 'left' || view === 'right', direction: index > 4 ? 1 : -1, near: (index > 4 ? 'L' : 'R') as 'L' | 'R', faceVisible: !rear };
}

export type CharacterVariant = 'hoodie' | 'stick';
/** Derive profile bind points without changing the saved project's artwork or manual deltas. */
export function profileBones(bones: Bone[], variant: CharacterVariant): Bone[] {
  const profile = bodyManifests[variant];
  return bones.map(bone => {
    const pivot = variant === 'stick' ? (profile.pivots as Record<string,number[]>)[bone.id.replace('wrist','hand').replace('ankle','foot').replace('clavicle','upperArm')] : undefined;
    const reference=(hoodie.pivots as Record<string,number[]>)[bone.id.replace('wrist','hand').replace('ankle','foot').replace('clavicle','upperArm')];
    const result = pivot && reference ? {...bone,pivotX:pivot[0]+bone.pivotX-reference[0],pivotY:pivot[1]+bone.pivotY-reference[1]} : {...bone};
    if (bone.id === 'head') { if(bone.pivotX===894 && bone.pivotY===170) { result.pivotX=profile.headPivot[0]; result.pivotY=profile.headPivot[1]; } result.x=Math.max(-3,Math.min(3,result.x)); result.y=Math.max(-3,Math.min(3,result.y)); }
    if (bone.id === 'neck') { result.x=Math.max(-3,Math.min(3,result.x)); result.y=Math.max(-3,Math.min(3,result.y)); result.rotation=Math.max(-8,Math.min(8,result.rotation)); }
    return result;
  });
}

/** Blend joint angles, retaining chain lengths throughout an IK/FK transition. */
export function blendLimb(fk:{start:Point;joint:Point;end:Point},ik:{start:Point;joint:Point;end:Point},amount:number) {
  const t=Math.max(0,Math.min(1,amount));
  const angle=(a:Point,b:Point)=>Math.atan2(b.y-a.y,b.x-a.x);
  const mixAngle=(a:number,b:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  const upper=distance(fk.start,fk.joint),lower=distance(fk.joint,fk.end);
  const a=mixAngle(angle(fk.start,fk.joint),angle(ik.start,ik.joint)),b=mixAngle(angle(fk.joint,fk.end),angle(ik.joint,ik.end));
  const joint={x:fk.start.x+Math.cos(a)*upper,y:fk.start.y+Math.sin(a)*upper};
  return {start:fk.start,joint,end:{x:joint.x+Math.cos(b)*lower,y:joint.y+Math.sin(b)*lower},clamped:false};
}
