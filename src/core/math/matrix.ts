export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface Point {
  x: number;
  y: number;
}

export const identity = (): Matrix => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

export function multiply(left: Matrix, right: Matrix): Matrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export const translation = (x: number, y: number): Matrix => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: x,
  f: y,
});

export const scaling = (x: number, y: number): Matrix => ({
  a: x,
  b: 0,
  c: 0,
  d: y,
  e: 0,
  f: 0,
});

export function rotation(degrees: number): Matrix {
  const radians = (degrees * Math.PI) / 180;
  return {
    a: Math.cos(radians),
    b: Math.sin(radians),
    c: -Math.sin(radians),
    d: Math.cos(radians),
    e: 0,
    f: 0,
  };
}

export function aroundPivot(
  pivot: Point,
  x: number,
  y: number,
  degrees: number,
  scaleX: number,
  scaleY: number,
): Matrix {
  return [
    translation(x, y),
    translation(pivot.x, pivot.y),
    rotation(degrees),
    scaling(scaleX, scaleY),
    translation(-pivot.x, -pivot.y),
  ].reduce(multiply, identity());
}

export function applyToPoint(matrix: Matrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export const toSvgMatrix = ({ a, b, c, d, e, f }: Matrix): string =>
  `matrix(${a} ${b} ${c} ${d} ${e} ${f})`;
