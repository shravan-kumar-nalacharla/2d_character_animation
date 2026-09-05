import { toNativeTransform } from "./AECoordinateConverter";
import { convertLayerConstraints } from "./DuikConstraintConverter";
import type { AERawComp, AERawLayer, DuikRawExport, ImportedDuikRig, NativeRigNode } from "./types";

export function assertDuikExport(value: unknown): asserts value is DuikRawExport {
  if (!value || typeof value !== "object") throw new Error("The export is not a JSON object.");
  const data = value as Partial<DuikRawExport>;
  if (data.schema !== "algowzxd.duik-ae-export" || data.schemaVersion !== 1) throw new Error("Unsupported Duik export schema.");
  if (!Array.isArray(data.comps) || data.comps.length === 0) throw new Error("The Duik export contains no compositions.");
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer";
const evidence = (layer: AERawLayer) => `${layer.name} ${layer.comment ?? ""} ${(layer.classification ?? []).join(" ")}`.toLowerCase();

function chooseRoot(data: DuikRawExport): AERawComp {
  const requested = data.project.rootCompId == null ? undefined : String(data.project.rootCompId);
  return data.comps.find((comp) => String(comp.id) === requested)
    ?? data.comps.reduce((best, comp) => comp.layers.length > best.layers.length ? comp : best);
}

function roleOf(layer: AERawLayer): NativeRigNode["role"] {
  const text = evidence(layer);
  if (/controller|control|ctrl/.test(text)) return "controller";
  if (/bone|structure|puppet pin/.test(text)) return "bone";
  return "artwork";
}

export function importDuikRig(data: DuikRawExport, roleOverrides: Record<string, NativeRigNode["role"]> = {}): ImportedDuikRig {
  assertDuikExport(data);
  const comp = chooseRoot(data);
  const role = (layer: AERawLayer) => roleOverrides[String(layer.id)] ?? roleOf(layer);
  const ids = new Map(comp.layers.map((layer) => [String(layer.id), `${role(layer)}-${slug(layer.name)}-${layer.index}`]));
  const nodes = comp.layers.map((layer): NativeRigNode => ({
    id: ids.get(String(layer.id))!,
    name: layer.name,
    parentId: layer.parentLayerId == null ? null : ids.get(String(layer.parentLayerId)) ?? null,
    sourceLayerId: String(layer.id),
    role: role(layer),
    ...toNativeTransform(layer.transform.evaluated),
  }));
  const constraints = comp.layers.flatMap(convertLayerConstraints);
  const flatten = (properties: NonNullable<AERawLayer["properties"]>): NonNullable<AERawLayer["properties"]> => properties.flatMap((property) => [property, ...flatten(property.children ?? [])]);
  const referenceAnimations = comp.layers.flatMap((layer) => flatten(layer.properties ?? []).flatMap((property) =>
    property.keyframes?.length ? [{ layerId: String(layer.id), propertyPath: property.path, keys: property.keyframes.length }] : [],
  ));
  const compatibility = { native: 0, approximated: 0, unsupported: 0 };
  constraints.forEach((constraint) => compatibility[constraint.compatibility]++);

  return {
    schema: "algowzxd.native-rig",
    schemaVersion: 1,
    characterId: "algowzxd_2024_duik",
    displayName: "Algowzxd 2024 Duik",
    source: { kind: "after-effects-duik", projectName: data.project.name, exporterVersion: data.exporterVersion, rootCompId: String(comp.id) },
    stage: { width: comp.width, height: comp.height, fps: comp.fps, duration: comp.duration },
    bones: nodes.filter((node) => node.role === "bone"),
    controllers: nodes.filter((node) => node.role === "controller"),
    artwork: nodes.filter((node) => node.role === "artwork"),
    constraints,
    originalRestPose: Object.fromEntries(nodes.map(({ id, x, y, rotation, scaleX, scaleY, pivotX, pivotY }) => [id, { x, y, rotation, scaleX, scaleY, pivotX, pivotY }])),
    referenceAnimations,
    compatibility,
  };
}
