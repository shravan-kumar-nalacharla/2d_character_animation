import { applyToPoint, aroundPivot, identity, multiply, type Matrix, type Point } from "../../core/math/matrix";
import type { AERawLayer, AERawTransform, NativeTransform } from "./types";

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function toNativeTransform(transform: AERawTransform): NativeTransform {
  const anchor = transform.anchorPoint ?? [0, 0];
  const position = transform.position ?? [0, 0];
  const scale = transform.scale ?? [100, 100];
  return {
    x: finite(position[0], 0),
    y: finite(position[1], 0),
    rotation: finite(transform.rotation, 0),
    scaleX: finite(scale[0], 100) / 100,
    scaleY: finite(scale[1], 100) / 100,
    pivotX: finite(anchor[0], 0),
    pivotY: finite(anchor[1], 0),
  };
}

export function localMatrix(transform: NativeTransform): Matrix {
  return aroundPivot(
    { x: transform.pivotX, y: transform.pivotY },
    transform.x,
    transform.y,
    transform.rotation,
    transform.scaleX,
    transform.scaleY,
  );
}

export function worldMatrix(layer: AERawLayer, byId: Map<string, AERawLayer>): Matrix {
  const chain: AERawLayer[] = [];
  const visited = new Set<string>();
  let current: AERawLayer | undefined = layer;
  while (current) {
    const id = String(current.id);
    if (visited.has(id)) break;
    visited.add(id);
    chain.unshift(current);
    current = current.parentLayerId == null ? undefined : byId.get(String(current.parentLayerId));
  }
  return chain.reduce((matrix, item) => multiply(matrix, localMatrix(toNativeTransform(item.transform.evaluated))), identity());
}

export function layerPointToComp(layer: AERawLayer, point: Point, byId: Map<string, AERawLayer>): Point {
  return applyToPoint(worldMatrix(layer, byId), point);
}
