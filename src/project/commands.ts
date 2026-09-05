import type { Command } from "../core/commands/CommandHistory";
import type { Bone, ProjectDocument } from "./schema";
import { replaceBone } from "./project";

export function changeBoneCommand(
  boneId: string,
  before: Bone,
  after: Bone,
  label = `Change ${before.name}`,
): Command<ProjectDocument> {
  return {
    label,
    apply: (project) => replaceBone(project, boneId, after),
    revert: (project) => replaceBone(project, boneId, before),
  };
}
