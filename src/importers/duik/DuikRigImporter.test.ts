import { describe, expect, it } from "vitest";
import { layerPointToComp, toNativeTransform } from "./AECoordinateConverter";
import { importDuikRig } from "./DuikRigImporter";
import { validateDuikRig } from "./DuikRigValidator";
import type { AERawLayer, DuikRawExport } from "./types";

const transform = (x: number, y: number) => ({
  raw: { anchorPoint: [0, 0], position: [x, y], scale: [100, 100], rotation: 0 },
  evaluated: { anchorPoint: [0, 0], position: [x, y], scale: [100, 100], rotation: 0 },
});

const fixture: DuikRawExport = {
  schema: "algowzxd.duik-ae-export", schemaVersion: 1, exporterVersion: "test", exportedAt: "2026-01-01",
  project: { name: "Algowzxd", rootCompId: 1 },
  comps: [{ id: 1, name: "Character", width: 1920, height: 1080, fps: 30, duration: 10, layers: [
    { id: 10, index: 1, name: "Head CONTROL", classification: ["controller"], transform: transform(400, 200), effects: [{ name: "Duik Controller", matchName: "Pseudo/DUIK", path: "Effects/Duik" }] },
    { id: 11, index: 2, name: "Head artwork", parentLayerId: 10, transform: transform(20, 30) },
  ] }],
};

describe("Duik import bridge", () => {
  it("normalizes AE scale and preserves pivots", () => {
    expect(toNativeTransform({ anchorPoint: [4, 5], position: [8, 9], scale: [50, 200], rotation: 12 })).toEqual({ x: 8, y: 9, rotation: 12, scaleX: 0.5, scaleY: 2, pivotX: 4, pivotY: 5 });
  });

  it("propagates parent transforms", () => {
    const layers = fixture.comps[0].layers as AERawLayer[];
    expect(layerPointToComp(layers[1], { x: 0, y: 0 }, new Map(layers.map((layer) => [String(layer.id), layer])))).toEqual({ x: 420, y: 230 });
  });

  it("imports and validates a controller hierarchy", () => {
    const rig = importDuikRig(fixture);
    expect(rig.controllers).toHaveLength(1);
    expect(rig.artwork[0].parentId).toBe(rig.controllers[0].id);
    expect(rig.compatibility.native).toBe(1);
    expect(validateDuikRig(rig).valid).toBe(true);
  });
});
