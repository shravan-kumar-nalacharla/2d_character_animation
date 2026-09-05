import { describe, expect, it } from "vitest";
import { applyToPoint } from "./matrix";
import { createDefaultProject } from "../../project/project";
import { calculateWorldMatrices } from "../../rig/Skeleton";

describe("transform hierarchy", () => {
  it("propagates a torso translation to the head pivot", () => {
    const project = createDefaultProject();
    const torso = project.rig.bones.find((bone) => bone.id === "torso")!;
    torso.x = 40;
    torso.y = -15;
    const head = project.rig.bones.find((bone) => bone.id === "head")!;
    const world = calculateWorldMatrices(project.rig.bones);
    const point = applyToPoint(world.get("head")!, { x: head.pivotX, y: head.pivotY });
    expect(point.x).toBeCloseTo(head.pivotX + 40);
    expect(point.y).toBeCloseTo(head.pivotY - 15);
  });

  it("rejects cycles", () => {
    const project = createDefaultProject();
    project.rig.bones.find((bone) => bone.id === "root")!.parentId = "head";
    expect(() => calculateWorldMatrices(project.rig.bones)).toThrow(/cycle/i);
  });
});
