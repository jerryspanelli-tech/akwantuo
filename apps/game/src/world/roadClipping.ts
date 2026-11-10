export interface RoadPoint { readonly x: number; readonly z: number; }
export interface RoadClipBounds { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number; }
const EPSILON = 1e-7;

/** Liang–Barsky clips one segment to an axis-aligned world-space rectangle. */
export function clipRoadSegment(a: RoadPoint, b: RoadPoint, bounds: RoadClipBounds): readonly [RoadPoint, RoadPoint] | null {
  const dx = b.x - a.x, dz = b.z - a.z;
  let t0 = 0, t1 = 1;
  const tests: readonly [number, number][] = [
    [-dx, a.x - bounds.minX], [dx, bounds.maxX - a.x],
    [-dz, a.z - bounds.minZ], [dz, bounds.maxZ - a.z]
  ];
  for (const [p, q] of tests) {
    if (Math.abs(p) <= EPSILON) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if (t1 - t0 <= EPSILON) return null;
  return [
    { x: a.x + dx * t0, z: a.z + dz * t0 },
    { x: a.x + dx * t1, z: a.z + dz * t1 }
  ];
}

/** Clips a polyline and returns independent continuous pieces inside the chunk. */
export function clipRoadPath(points: readonly RoadPoint[], bounds: RoadClipBounds): RoadPoint[][] {
  const pieces: RoadPoint[][] = [];
  if (points.length < 2) return pieces;
  for (let i = 0; i < points.length - 1; i += 1) {
    const segment = clipRoadSegment(points[i], points[i + 1], bounds);
    if (!segment) continue;
    const previous = pieces[pieces.length - 1];
    const first = segment[0];
    if (previous && Math.hypot(previous[previous.length - 1].x - first.x, previous[previous.length - 1].z - first.z) <= EPSILON) {
      const last = segment[1];
      const tail = previous[previous.length - 1];
      if (Math.hypot(tail.x - last.x, tail.z - last.z) > EPSILON) previous.push(last);
    } else {
      pieces.push([segment[0], segment[1]]);
    }
  }
  return pieces.filter((piece) => piece.length >= 2);
}
