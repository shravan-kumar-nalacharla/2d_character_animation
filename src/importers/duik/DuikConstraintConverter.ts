import type { AERawLayer, AERawProperty, NativeConstraint } from "./types";

function flatten(properties: AERawProperty[] = []): AERawProperty[] {
  return properties.flatMap((property) => [property, ...flatten(property.children)]);
}

export function convertLayerConstraints(layer: AERawLayer): NativeConstraint[] {
  const properties = [...flatten(layer.effects), ...flatten(layer.expressions)];
  const text = [
    layer.name,
    layer.comment ?? "",
    ...properties.flatMap((property) => [property.name, property.matchName, property.expression ?? ""]),
  ].join("\n").toLowerCase();
  const sourceLayerId = String(layer.id);
  const constraints: NativeConstraint[] = [];

  if (/\bik\b|two.?layer|two.?bone/.test(text)) {
    constraints.push({ id: `ik-${sourceLayerId}`, name: `${layer.name} IK`, type: "twoBoneIK", sourceLayerId, targetIds: [], compatibility: "approximated", evidence: "Duik/IK naming or expression evidence" });
  }
  if (/duik.*controller|controller.?type|\/\*== duik: controller/.test(text)) {
    constraints.push({ id: `fk-${sourceLayerId}`, name: `${layer.name} controller`, type: "fk", sourceLayerId, targetIds: [], compatibility: "native", evidence: "Duik controller metadata" });
  }
  if (/2dslider|slider control|c < slider >/.test(text)) {
    constraints.push({ id: `slider-${sourceLayerId}`, name: `${layer.name} slider`, type: "slider", sourceLayerId, targetIds: [], compatibility: "native", evidence: "Duik/AE slider pseudo-effect" });
  }
  for (const property of properties.filter((item) => item.expression)) {
    constraints.push({
      id: `expression-${sourceLayerId}-${constraints.length}`,
      name: `${layer.name}: ${property.name}`,
      type: "expressionReference",
      sourceLayerId,
      targetIds: [],
      compatibility: /valueattime|tocomp|fromcomp|effect\(/i.test(property.expression ?? "") ? "approximated" : "unsupported",
      evidence: property.expression!.slice(0, 180),
    });
  }
  return constraints;
}
