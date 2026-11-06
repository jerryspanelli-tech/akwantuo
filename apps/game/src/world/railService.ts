import {
  type RailTrainOperationConfig,
  type RailStationStop,
  isRailTrainOperationConfigValid
} from "./railTrainOperations";
import { GREATER_ACCRA_RAIL_NODES, getRailRoute } from "./railNetwork";
import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";

export type RailServiceTuning = Readonly<{
  maximumSpeedMps?: number;
  accelerationMps2?: number;
  serviceBrakingMps2?: number;
  stationDwellSeconds?: number;
}>;

/**
 * Builds a deterministic prototype service from one or more connected,
 * first-release schematic rail routes. Route chains must meet at the exact
 * authored node and centreline point; future expansion is never implicit.
 * Only planned first-release stations become operational stops.
 */
export function createRailServiceConfigForRouteChain(
  routeIds: readonly string[],
  tuning: RailServiceTuning = {}
): RailTrainOperationConfig {
  if (routeIds.length === 0 || new Set(routeIds).size !== routeIds.length) {
    throw new Error("Rail service route chain must contain unique route IDs.");
  }
  const routes = routeIds.map((routeId) => {
    const route = getRailRoute(routeId);
    if (!route || !route.firstRelease) {
      throw new Error("Unknown or non-playable rail service route: " + routeId);
    }
    return route;
  });

  for (let index = 1; index < routes.length; index += 1) {
    const previous = routes[index - 1];
    const current = routes[index];
    const previousEnd = previous.points[previous.points.length - 1];
    const currentStart = current.points[0];
    if (previous.toNodeId !== current.fromNodeId ||
        previousEnd.x !== currentStart.x ||
        previousEnd.z !== currentStart.z) {
      throw new Error("Rail service route chain is not continuously connected.");
    }
  }

  const path = routes.flatMap((route, index) =>
    index === 0 ? route.points : route.points.slice(1)
  );
  const stops: RailStationStop[] = [];
  for (const node of GREATER_ACCRA_RAIL_NODES) {
    if (node.kind !== "station" || !node.firstRelease) continue;
    const stationDesign = GREATER_ACCRA_RAIL_STATIONS.find((station) =>
      station.railNodeId === node.id && station.firstRelease && station.status === "planned"
    );
    if (!stationDesign) continue;
    const pointIndex = path.findIndex((point) =>
      point.x === node.position.x && point.z === node.position.z
    );
    if (pointIndex <= 0) continue;

    let distanceM = 0;
    for (let index = 1; index <= pointIndex; index += 1) {
      const previous = path[index - 1];
      const current = path[index];
      distanceM += Math.hypot(current.x - previous.x, current.z - previous.z);
    }
    stops.push({
      id: node.id,
      distanceM,
      dwellSeconds: tuning.stationDwellSeconds ?? 20
    });
  }

  const config: RailTrainOperationConfig = {
    path: path.map(({ x, z }) => ({ x, z })),
    stops,
    maximumSpeedMps: tuning.maximumSpeedMps ?? 22,
    accelerationMps2: tuning.accelerationMps2 ?? 0.55,
    serviceBrakingMps2: tuning.serviceBrakingMps2 ?? 0.8
  };
  if (!isRailTrainOperationConfigValid(config)) {
    throw new Error("Rail service route chain has invalid operation data: " + routeIds.join(" -> "));
  }
  return config;
}

/** Backwards-compatible single-route service adapter. */
export function createRailServiceConfig(
  routeId: string,
  tuning: RailServiceTuning = {}
): RailTrainOperationConfig {
  return createRailServiceConfigForRouteChain([routeId], tuning);
}
