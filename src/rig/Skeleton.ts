import { aroundPivot, identity, multiply, type Matrix } from "../core/math/matrix";
import type { Bone } from "../project/schema";

export function calculateWorldMatrices(bones: Bone[]): Map<string, Matrix> {
  const byId = new Map(bones.map((bone) => [bone.id, bone]));
  const world = new Map<string, Matrix>();
  const visiting = new Set<string>();

  const visit = (bone: Bone): Matrix => {
    const cached = world.get(bone.id);
    if (cached) return cached;
    if (visiting.has(bone.id)) throw new Error(`Rig cycle detected at ${bone.id}.`);
    visiting.add(bone.id);
    const local = aroundPivot(
      { x: bone.pivotX, y: bone.pivotY },
      bone.x,
      bone.y,
      Math.min(bone.maxRotation, Math.max(bone.minRotation, bone.rotation)),
      bone.scaleX,
      bone.scaleY,
    );
    const parent = bone.parentId ? byId.get(bone.parentId) : undefined;
    const result = parent ? multiply(visit(parent), local) : multiply(identity(), local);
    visiting.delete(bone.id);
    world.set(bone.id, result);
    return result;
  };

  bones.forEach(visit);
  return world;
}

export function findBoneForArtwork(bones: Bone[], artworkId: string): Bone | undefined {
  return bones.find((bone) => bone.artworkPrefixes.some((prefix) => artworkId.startsWith(prefix)));
}

export function descendantsOf(bones: Bone[], parentId: string): Bone[] {
  const result: Bone[] = [];
  const visit = (id: string) => {
    bones.filter((bone) => bone.parentId === id).forEach((child) => {
      result.push(child);
      visit(child.id);
    });
  };
  visit(parentId);
  return result;
}
