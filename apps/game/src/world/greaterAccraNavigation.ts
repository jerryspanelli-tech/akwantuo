import type { MapPoint, MapRoadPath } from "./greaterAccraLayout";

export type GreaterAccraRoute = Readonly<{
  /** Full guidance line, including short off-road connectors to the road network. */
  points: readonly MapPoint[];
  /** Road-only geometry; never draws an off-road connector across buildings. */
  roadPoints: readonly MapPoint[];
  distanceM: number;
  startSnapM: number;
  destinationSnapM: number;
}>;

type RoadEdge = { to: string; distance: number };
type Projection = {
  roadId: string;
  segmentIndex: number;
  t: number;
  point: MapPoint;
  distance: number;
  a: string;
  b: string;
  segmentLength: number;
};

const keyOf = (point: MapPoint) => `${point.x},${point.z}`;
const distanceBetween = (a: MapPoint, b: MapPoint) => Math.hypot(b.x - a.x, b.z - a.z);
const appendDistinct = (points: MapPoint[], point: MapPoint) => {
  const previous = points[points.length - 1];
  if (!previous || distanceBetween(previous, point) > 0.5) points.push({ x: point.x, z: point.z });
};

function nearestRoadProjection(
  position: MapPoint,
  roads: readonly MapRoadPath[],
  maxSnapDistance: number
): Projection | null {
  let best: Projection | null = null;
  for (const road of roads) {
    if (!road.playableInFirstRelease) continue;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1) continue;
      const t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / lengthSquared));
      const projected = { x: a.x + dx * t, z: a.z + dz * t };
      const distance = distanceBetween(position, projected);
      if (distance <= maxSnapDistance && (!best || distance < best.distance)) {
        best = {
          roadId: road.roadSegmentId,
          segmentIndex: i,
          t,
          point: projected,
          distance,
          a: keyOf(a),
          b: keyOf(b),
          segmentLength: Math.sqrt(lengthSquared)
        };
      }
    }
  }
  return best;
}

function buildRoadGraph(roads: readonly MapRoadPath[]) {
  const graph = new Map<string, RoadEdge[]>();
  const positions = new Map<string, MapPoint>();
  const addNode = (point: MapPoint) => {
    const key = keyOf(point);
    if (!graph.has(key)) graph.set(key, []);
    positions.set(key, point);
    return key;
  };
  for (const road of roads) {
    if (!road.playableInFirstRelease) continue;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const from = addNode(a);
      const to = addNode(b);
      const distance = distanceBetween(a, b);
      if (distance < 1) continue;
      graph.get(from)!.push({ to, distance });
      graph.get(to)!.push({ to: from, distance });
    }
  }
  return { graph, positions };
}

function shortestPath(
  graph: Map<string, RoadEdge[]>,
  from: string,
  to: string
): { distance: number; nodes: string[] } | null {
  if (!graph.has(from) || !graph.has(to)) return null;
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const pending = new Set(graph.keys());
  for (const node of pending) distances.set(node, Number.POSITIVE_INFINITY);
  distances.set(from, 0);

  while (pending.size) {
    let current: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const node of pending) {
      const candidate = distances.get(node) ?? Number.POSITIVE_INFINITY;
      if (candidate < bestDistance) {
        current = node;
        bestDistance = candidate;
      }
    }
    if (current === null || !Number.isFinite(bestDistance)) break;
    pending.delete(current);
    if (current === to) break;
    for (const edge of graph.get(current) ?? []) {
      if (!pending.has(edge.to)) continue;
      const nextDistance = bestDistance + edge.distance;
      if (nextDistance < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, nextDistance);
        previous.set(edge.to, current);
      }
    }
  }

  const distance = distances.get(to) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(distance)) return null;
  const nodes = [to];
  let cursor = to;
  while (cursor !== from) {
    const parent = previous.get(cursor);
    if (!parent) return null;
    nodes.push(parent);
    cursor = parent;
  }
  nodes.reverse();
  return { distance, nodes };
}

/**
 * Finds a shortest path along first-release road centre-lines.
 * It refuses destinations too far from a road or in a disconnected road component.
 * This is a game-map route, not a GPS or traffic-aware route.
 */
export function findGreaterAccraRoadRoute(
  start: MapPoint,
  destination: MapPoint,
  roads: readonly MapRoadPath[],
  maxSnapDistance = 650
): GreaterAccraRoute | null {
  const startSnap = nearestRoadProjection(start, roads, maxSnapDistance);
  const destinationSnap = nearestRoadProjection(destination, roads, maxSnapDistance);
  if (!startSnap || !destinationSnap) return null;

  const { graph, positions } = buildRoadGraph(roads);
  let best: { distance: number; roadPoints: MapPoint[] } | null = null;

  // If both points lie on the same polyline edge, travelling directly along
  // that edge can be shorter than routing out to an intersection and back.
  if (startSnap.roadId === destinationSnap.roadId &&
      startSnap.segmentIndex === destinationSnap.segmentIndex) {
    best = {
      distance: startSnap.distance + Math.abs(startSnap.t - destinationSnap.t) * startSnap.segmentLength + destinationSnap.distance,
      roadPoints: [startSnap.point, destinationSnap.point]
    };
  }

  const startOptions = [
    { node: startSnap.a, cost: startSnap.t * startSnap.segmentLength },
    { node: startSnap.b, cost: (1 - startSnap.t) * startSnap.segmentLength }
  ];
  const destinationOptions = [
    { node: destinationSnap.a, cost: destinationSnap.t * destinationSnap.segmentLength },
    { node: destinationSnap.b, cost: (1 - destinationSnap.t) * destinationSnap.segmentLength }
  ];

  for (const from of startOptions) {
    for (const to of destinationOptions) {
      const path = shortestPath(graph, from.node, to.node);
      if (!path) continue;
      const total = startSnap.distance + from.cost + path.distance + to.cost + destinationSnap.distance;
      if (best && total >= best.distance) continue;
      const roadPoints: MapPoint[] = [];
      appendDistinct(roadPoints, startSnap.point);
      for (const node of path.nodes) {
        const point = positions.get(node);
        if (point) appendDistinct(roadPoints, point);
      }
      appendDistinct(roadPoints, destinationSnap.point);
      best = { distance: total, roadPoints };
    }
  }

  if (!best) return null;
  const points: MapPoint[] = [];
  appendDistinct(points, start);
  for (const point of best.roadPoints) appendDistinct(points, point);
  appendDistinct(points, destination);
  return {
    points,
    roadPoints: best.roadPoints,
    distanceM: best.distance,
    startSnapM: startSnap.distance,
    destinationSnapM: destinationSnap.distance
  };
}
