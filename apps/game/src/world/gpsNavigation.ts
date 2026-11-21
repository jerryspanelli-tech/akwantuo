import { GREATER_ACCRA_ROAD_PATHS, type MapPoint } from "./greaterAccraLayout";

export type GpsRoute = Readonly<{
  points: readonly MapPoint[];
  distanceM: number;
  startRoadId: string;
  destinationRoadId: string;
}>;

type Projection = {
  point: MapPoint;
  distanceM: number;
  roadId: string;
  segmentIndex: number;
  from: MapPoint;
  to: MapPoint;
  t: number;
};

const distance = (a: MapPoint, b: MapPoint): number => Math.hypot(b.x - a.x, b.z - a.z);
const key = (point: MapPoint): string => `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;

function projectToRoad(point: MapPoint, maxDistanceM: number): Projection | null {
  let best: Projection | null = null;
  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease) continue;
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const from = road.points[index], to = road.points[index + 1];
      const dx = to.x - from.x, dz = to.z - from.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared <= 0) continue;
      const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared));
      const projected = { x: from.x + dx * t, z: from.z + dz * t };
      const distanceM = distance(point, projected);
      if (distanceM <= maxDistanceM && (!best || distanceM < best.distanceM)) {
        best = { point: projected, distanceM, roadId: road.roadSegmentId, segmentIndex: index, from, to, t };
      }
    }
  }
  return best;
}

function addEdge(graph: Map<string, Map<string, number>>, a: string, b: string, weight: number): void {
  if (!graph.has(a)) graph.set(a, new Map());
  if (!graph.has(b)) graph.set(b, new Map());
  graph.get(a)!.set(b, Math.min(graph.get(a)!.get(b) ?? Infinity, weight));
  graph.get(b)!.set(a, Math.min(graph.get(b)!.get(a) ?? Infinity, weight));
}

/**
 * Builds a drivable route along the authored road centre-lines. The start and
 * destination are snapped to the nearest playable road; disconnected roads
 * remain disconnected instead of inventing a straight-line shortcut.
 */
export function buildGpsRoute(
  start: MapPoint,
  destination: MapPoint,
  options: { maxStartSnapM?: number; maxDestinationSnapM?: number } = {}
): GpsRoute | null {
  const startProjection = projectToRoad(start, options.maxStartSnapM ?? 900);
  const endProjection = projectToRoad(destination, options.maxDestinationSnapM ?? 650);
  if (!startProjection || !endProjection) return null;

  const graph = new Map<string, Map<string, number>>();
  const points = new Map<string, MapPoint>();
  const register = (point: MapPoint): string => {
    const id = key(point);
    points.set(id, point);
    if (!graph.has(id)) graph.set(id, new Map());
    return id;
  };

  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease) continue;
    for (let index = 0; index < road.points.length - 1; index += 1) {
      const a = road.points[index], b = road.points[index + 1];
      addEdge(graph, register(a), register(b), distance(a, b));
    }
  }

  const startId = "__gps_start", endId = "__gps_destination";
  const startA = register(startProjection.from), startB = register(startProjection.to);
  const endA = register(endProjection.from), endB = register(endProjection.to);
  points.set(startId, startProjection.point);
  points.set(endId, endProjection.point);
  graph.set(startId, new Map());
  graph.set(endId, new Map());
  addEdge(graph, startId, startA, distance(startProjection.point, startProjection.from));
  addEdge(graph, startId, startB, distance(startProjection.point, startProjection.to));
  addEdge(graph, endId, endA, distance(endProjection.point, endProjection.from));
  addEdge(graph, endId, endB, distance(endProjection.point, endProjection.to));
  if (startProjection.roadId === endProjection.roadId &&
      startProjection.segmentIndex === endProjection.segmentIndex) {
    addEdge(graph, startId, endId, distance(startProjection.point, endProjection.point));
  }

  const costs = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const pending = new Set(graph.keys());
  while (pending.size) {
    let current: string | null = null;
    let currentCost = Infinity;
    for (const candidate of pending) {
      const cost = costs.get(candidate) ?? Infinity;
      if (cost < currentCost) { current = candidate; currentCost = cost; }
    }
    if (current === null || !Number.isFinite(currentCost)) break;
    if (current === endId) break;
    pending.delete(current);
    for (const [next, weight] of graph.get(current) ?? []) {
      if (!pending.has(next)) continue;
      const candidateCost = currentCost + weight;
      if (candidateCost < (costs.get(next) ?? Infinity)) {
        costs.set(next, candidateCost);
        previous.set(next, current);
      }
    }
  }

  if (!costs.has(endId)) return null;
  const routeIds = [endId];
  let cursor = endId;
  while (cursor !== startId) {
    const parent = previous.get(cursor);
    if (!parent) return null;
    cursor = parent;
    routeIds.push(cursor);
  }
  routeIds.reverse();
  const routePoints = routeIds.map((id) => points.get(id)).filter((point): point is MapPoint => !!point);
  const compact: MapPoint[] = [];
  for (const point of routePoints) {
    if (!compact.length || distance(compact[compact.length - 1], point) > 0.01) compact.push(point);
  }
  const routeDistance = compact.slice(1).reduce((sum, point, index) => sum + distance(compact[index], point), 0);
  return compact.length >= 2 ? {
    points: compact,
    distanceM: routeDistance,
    startRoadId: startProjection.roadId,
    destinationRoadId: endProjection.roadId
  } : null;
}

/** Remaining centre-line distance from the player's nearest point on a route. */
export function getRemainingRouteDistance(route: readonly MapPoint[], position: MapPoint): number {
  if (route.length < 2) return 0;
  let bestDistance = Infinity, bestIndex = 0, bestT = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const a = route[index], b = route[index + 1];
    const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / lengthSquared)) : 0;
    const projected = { x: a.x + dx * t, z: a.z + dz * t };
    const gap = distance(position, projected);
    if (gap < bestDistance) { bestDistance = gap; bestIndex = index; bestT = t; }
  }
  let remaining = distance(route[bestIndex], route[bestIndex + 1]) * (1 - bestT);
  for (let index = bestIndex + 1; index < route.length - 1; index += 1) {
    remaining += distance(route[index], route[index + 1]);
  }
  return remaining;
}
