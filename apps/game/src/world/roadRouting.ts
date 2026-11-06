import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";
import { getMapRoadPath, type MapPoint } from "./greaterAccraLayout";

export type RoadRouteOptions = Readonly<{
  /** Future gateway stubs are excluded unless explicitly requested. */
  includeFutureExpansion?: boolean;
}>;

export type RoadRoute = Readonly<{
  fromNodeId: string;
  toNodeId: string;
  nodeIds: readonly string[];
  roadSegmentIds: readonly string[];
  distanceM: number;
  includesFutureExpansion: boolean;
  /** The graph is conceptual; this route is not a certified legal-turn path. */
  status: "planning_only";
}>;

type Edge = Readonly<{ segmentId: string; nextNodeId: string; distanceM: number; future: boolean }>;

function polylineLength(points: readonly MapPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].z - points[index - 1].z
    );
  }
  return length;
}

function buildAdjacency(includeFutureExpansion: boolean): Map<string, Edge[]> {
  const adjacency = new Map<string, Edge[]>(
    GREATER_ACCRA_ROAD_NETWORK.nodes.map((node) => [node.id, []])
  );
  for (const segment of GREATER_ACCRA_ROAD_NETWORK.segments) {
    if (segment.futureExpansion && !includeFutureExpansion) continue;
    const path = getMapRoadPath(segment.id);
    if (!path || path.points.length < 2) continue;
    const distanceM = polylineLength(path.points);
    if (!Number.isFinite(distanceM) || distanceM <= 0) continue;
    const from = adjacency.get(segment.fromNodeId);
    const to = adjacency.get(segment.toNodeId);
    if (!from || !to) continue;
    // The conceptual primary-road graph is treated as bidirectional. Turn
    // restrictions and grade-separated ramp legality remain separate design work.
    from.push({ segmentId: segment.id, nextNodeId: segment.toNodeId, distanceM, future: !!segment.futureExpansion });
    to.push({ segmentId: segment.id, nextNodeId: segment.fromNodeId, distanceM, future: !!segment.futureExpansion });
  }
  for (const edges of adjacency.values()) edges.sort((a, b) => a.segmentId.localeCompare(b.segmentId));
  return adjacency;
}

/**
 * Finds a shortest-distance path through the conceptual Greater Accra primary
 * road graph. This is useful for route planning and validation only: it does
 * not authorize turns, ramp transitions or traffic-signal movements.
 */
export function findShortestRoadRoute(
  fromNodeId: string,
  toNodeId: string,
  options: RoadRouteOptions = {}
): RoadRoute | null {
  if (fromNodeId === toNodeId) {
    return GREATER_ACCRA_ROAD_NETWORK.nodes.some((node) => node.id === fromNodeId)
      ? { fromNodeId, toNodeId, nodeIds: [fromNodeId], roadSegmentIds: [], distanceM: 0,
          includesFutureExpansion: false, status: "planning_only" }
      : null;
  }
  const adjacency = buildAdjacency(options.includeFutureExpansion === true);
  if (!adjacency.has(fromNodeId) || !adjacency.has(toNodeId)) return null;

  const distances = new Map<string, number>([[fromNodeId, 0]]);
  const previous = new Map<string, { nodeId: string; segmentId: string; future: boolean }>();
  const pending = new Set(adjacency.keys());

  while (pending.size > 0) {
    let current: string | undefined;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const nodeId of pending) {
      const candidate = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (candidate < currentDistance) {
        current = nodeId;
        currentDistance = candidate;
      }
    }
    if (!current || !Number.isFinite(currentDistance)) break;
    if (current === toNodeId) break;
    pending.delete(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (!pending.has(edge.nextNodeId)) continue;
      const nextDistance = currentDistance + edge.distanceM;
      const oldDistance = distances.get(edge.nextNodeId) ?? Number.POSITIVE_INFINITY;
      if (nextDistance < oldDistance) {
        distances.set(edge.nextNodeId, nextDistance);
        previous.set(edge.nextNodeId, {
          nodeId: current,
          segmentId: edge.segmentId,
          future: edge.future
        });
      }
    }
  }

  const distanceM = distances.get(toNodeId);
  if (distanceM === undefined || !Number.isFinite(distanceM)) return null;

  const nodeIds = [toNodeId];
  const roadSegmentIds: string[] = [];
  let includesFutureExpansion = false;
  let cursor = toNodeId;
  while (cursor !== fromNodeId) {
    const step = previous.get(cursor);
    if (!step) return null;
    roadSegmentIds.push(step.segmentId);
    includesFutureExpansion ||= step.future;
    cursor = step.nodeId;
    nodeIds.push(cursor);
  }
  nodeIds.reverse();
  roadSegmentIds.reverse();

  const route: RoadRoute = {
    fromNodeId, toNodeId, nodeIds, roadSegmentIds, distanceM,
    includesFutureExpansion, status: "planning_only"
  };
  return isRoadRouteValid(route, options) ? route : null;
}

export function isRoadRouteValid(
  value: unknown,
  options: RoadRouteOptions = {}
): value is RoadRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<RoadRoute>;
  if (route.status !== "planning_only" ||
      typeof route.fromNodeId !== "string" || typeof route.toNodeId !== "string" ||
      !Array.isArray(route.nodeIds) || !Array.isArray(route.roadSegmentIds) ||
      route.nodeIds.length !== route.roadSegmentIds.length + 1 ||
      route.nodeIds[0] !== route.fromNodeId ||
      route.nodeIds[route.nodeIds.length - 1] !== route.toNodeId ||
      !Number.isFinite(route.distanceM) || (route.distanceM ?? -1) < 0 ||
      typeof route.includesFutureExpansion !== "boolean") return false;
  if (route.roadSegmentIds.length === 0) {
    return route.fromNodeId === route.toNodeId &&
      route.nodeIds.length === 1 && route.distanceM === 0 &&
      route.includesFutureExpansion === false;
  }

  let total = 0;
  let includesFuture = false;
  for (let index = 0; index < route.roadSegmentIds.length; index += 1) {
    const segmentId = route.roadSegmentIds[index];
    const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === segmentId);
    const path = getMapRoadPath(segmentId);
    if (!segment || !path || (segment.futureExpansion && !options.includeFutureExpansion)) return false;
    const a = route.nodeIds[index];
    const b = route.nodeIds[index + 1];
    if (!((segment.fromNodeId === a && segment.toNodeId === b) ||
          (segment.fromNodeId === b && segment.toNodeId === a))) return false;
    total += polylineLength(path.points);
    includesFuture ||= !!segment.futureExpansion;
  }
  return Math.abs(total - route.distanceM) < 1e-5 &&
    includesFuture === route.includesFutureExpansion;
}
