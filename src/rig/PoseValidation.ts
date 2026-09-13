import { distance } from './FullBody';
import type { Point } from '../core/math/matrix';
export interface LimbPose { start:Point; joint:Point; end:Point }
export const intersects = (a:Point,b:Point,c:Point,d:Point) => {
  const cross=(p:Point,q:Point,r:Point)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return cross(a,b,c)*cross(a,b,d)<-1e-6 && cross(c,d,a)*cross(c,d,b)<-1e-6;
};
export function validateLimb(limb:LimbPose, socket:Point, upper:number, lower:number):string[] {
  const issues:string[]=[];
  if (![limb.start,limb.joint,limb.end].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))) return ['invalid-transform'];
  if(distance(limb.start,socket)>.01) issues.push('detached-shoulder');
  if(Math.abs(distance(limb.start,limb.joint)-upper)>.02 || Math.abs(distance(limb.joint,limb.end)-lower)>.02) issues.push('limb-length');
  return issues;
}
export function validateContacts(left:LimbPose,right:LimbPose,gesture:string):string[] {
  const issues:string[]=[];
  const contact=['folded-arms','thinking','hand-on-chin','hands-on-hips','facepalm'].includes(gesture);
  if(!contact && intersects(left.joint,left.end,right.joint,right.end)) issues.push('crossed-forearms');
  for(const limb of [left,right]) {
    if(!contact && limb.end.x>805 && limb.end.x<984 && limb.end.y>55 && limb.end.y<250) issues.push('hand-face');
    if(!contact && limb.end.x>840 && limb.end.x<950 && limb.end.y>330 && limb.end.y<550) issues.push('hand-torso');
  }
  return issues;
}

export function validatePose(pose:{left:LimbPose;right:LimbPose;legs?:[LimbPose,LimbPose];neck?:Point;gesture:string;variant:'hoodie'|'stick';handAssets?:boolean;shoeAssets?:boolean;zOrder?:string[]}):string[] {
  const issues=validateContacts(pose.left,pose.right,pose.gesture);
  const intentional=['folded-arms','thinking','hand-on-chin','facepalm','hands-on-hips','crying-posture','laughing'].includes(pose.gesture);
  if(!intentional) for(const limb of [pose.left,pose.right]) {
    const across=(limb.joint.x<840&&limb.end.x>950)||(limb.end.x<840&&limb.joint.x>950);
    if(across && Math.min(limb.joint.y,limb.end.y)<550 && Math.max(limb.joint.y,limb.end.y)>330) issues.push('forearm-torso');
  }
  if(pose.legs && intersects(pose.legs[0].joint,pose.legs[0].end,pose.legs[1].joint,pose.legs[1].end)) issues.push('crossed-shins');
  if(pose.neck && (pose.neck.x<870||pose.neck.x>920||pose.neck.y<265||pose.neck.y>312)) issues.push('neck-outside-collar');
  if(pose.variant==='stick'&&(pose.handAssets||pose.shoeAssets)) issues.push('incorrect-stick-attachment');
  if(pose.variant==='hoodie'&&pose.handAssets===false) issues.push('missing-hand-attachment');
  if(pose.zOrder && new Set(pose.zOrder).size!==pose.zOrder.length) issues.push('invalid-z-order');
  return [...new Set(issues)];
}
