import type { ImportedDuikRig, ValidationIssue, ValidationResult } from "./types";

export function validateDuikRig(rig: ImportedDuikRig): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodes = [...rig.bones, ...rig.controllers, ...rig.artwork];
  const counts = new Map<string, number>();
  nodes.forEach((node) => counts.set(node.id, (counts.get(node.id) ?? 0) + 1));
  const ids = new Set(nodes.map((node) => node.id));

  counts.forEach((count, id) => { if (count > 1) issues.push({ severity: "error", code: "duplicate-id", message: `Duplicate node id: ${id}`, nodeId: id }); });
  for (const node of nodes) {
    if (node.parentId && !ids.has(node.parentId)) issues.push({ severity: "error", code: "missing-parent", message: `${node.name} has a missing parent.`, nodeId: node.id });
    const values = [node.x, node.y, node.rotation, node.scaleX, node.scaleY, node.pivotX, node.pivotY];
    if (!values.every(Number.isFinite)) issues.push({ severity: "error", code: "nonfinite-transform", message: `${node.name} contains an invalid transform.`, nodeId: node.id });
    const seen = new Set<string>([node.id]);
    let parent = node.parentId;
    while (parent) {
      if (seen.has(parent)) { issues.push({ severity: "error", code: "parent-cycle", message: `${node.name} is in a parenting cycle.`, nodeId: node.id }); break; }
      seen.add(parent);
      parent = nodes.find((candidate) => candidate.id === parent)?.parentId ?? null;
    }
  }
  if (!(rig.stage.width > 0 && rig.stage.height > 0 && rig.stage.fps > 0)) issues.push({ severity: "error", code: "invalid-stage", message: "Stage dimensions or frame rate are invalid." });
  for (const constraint of rig.constraints) {
    if (constraint.compatibility === "unsupported") issues.push({ severity: "warning", code: "unsupported-expression", message: `${constraint.name} requires manual recreation.`, nodeId: constraint.sourceLayerId });
  }
  if (!rig.controllers.length) issues.push({ severity: "warning", code: "no-controllers", message: "No controllers were identified; review layer mapping." });
  const summary = {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
  return { valid: summary.errors === 0, summary, issues };
}
