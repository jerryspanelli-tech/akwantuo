import {
  type RailTrainOperationConfig,
  type RailStationStop,
  isRailTrainOperationConfigValid
} from "./railTrainOperations";
import { GREATER_ACCRA_RAIL_NODES, getRailRoute } from "./railNetwork";
import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";

/**
 * Builds a deterministic prototype service config from a named schematic rail
 * route. Only planned first-release stations whose nodes exactly match the
 * route centreline become operational stops. Candidate stops remain excluded.
 */
export function createRailServiceConfig(
  routeId: string,
  tuning: Readonly<{
    maximumSpeedMps?: number;
    accelerationMps2?: number;
    serviceBrakingMps2?: number;
    stationDwellSeconds?: number;
  }> = {}
): RailTrainOperationConfig {
  const route = getRailRoute(routeId);
  if (!route || !route.firstRelease) {
    throw new Error("Unknown or non-playable rail service route: " + routeId);
  }

  const stops: RailStationStop[] = [];
  for (const node of GREATER_ACCRA_RAIL_NODES) {
    if (node.kind !== "station" || !node.firstRelease) continue;
    const stationDesign = GREATER_ACCRA_RAIL_STATIONS.find((station) =>
      station.railNodeId === node.id && station.firstRelease && station.status === "planned"
    );
    if (!stationDesign) continue;
    const pointIndex = route.points.findIndex((point) =>
      point.x === node.position.x && point.z === node.position.z
    );
    if (pointIndex <= 0) continue;

    let distanceM = 0;
    for (let index = 1; index <= pointIndex; index += 1) {
      const previous = route.points[index - 1];
      const current = route.points[index];
      distanceM += Math.hypot(current.x - previous.x, current.z - previous.z);
    }
    stops.push({
      id: node.id,
      distanceM,
      dwellSeconds: tuning.stationDwellSeconds ?? 20
    });
  }

  const config: RailTrainOperationConfig = {
    path: route.points.map(({ x, z }) => ({ x, z })),
    stops,
    maximumSpeedMps: tuning.maximumSpeedMps ?? 22,
    accelerationMps2: tuning.accelerationMps2 ?? 0.55,
    serviceBrakingMps2: tuning.serviceBrakingMps2 ?? 0.8
  };
  if (!isRailTrainOperationConfigValid(config)) {
    throw new Error("Rail service route has invalid operation data: " + routeId);
  }
  return config;
}