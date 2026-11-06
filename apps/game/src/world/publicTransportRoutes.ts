import { findShortestRoadRoute, isRoadRouteValid } from "./roadRouting";
import { getRoadNode } from "./roadNetwork";

export type PublicTransportCorridorMode = "trotro" | "city_bus" | "shared_taxi";

export type PublicTransportRoutePlan = Readonly<{
  id: string;
  name: string;
  mode: PublicTransportCorridorMode;
  /** Major-road junction/area anchors only; these are not approved passenger stops. */
  waypointNodeIds: readonly string[];
  roadNodeIds: readonly string[];
  roadSegmentIds: readonly string[];
  distanceM: number;
  status: "planning_only";
  serviceNote: string;
}>;

type RouteDefinition = Readonly<{
  id: string;
  name: string;
  mode: PublicTransportCorridorMode;
  waypointNodeIds: readonly string[];
  serviceNote: string;
}>;

const ROUTE_DEFINITIONS: readonly RouteDefinition[] = [
  {
    id: "trotro-mallam-to-tema",
    name: "Mallam – Kaneshie – Circle – Tema",
    mode: "trotro",
    waypointNodeIds: ["mallam-junction", "kaneshie-interchange", "circle-junction", "tema-motorway-junction"],
    serviceNote: "Proposed west-to-east trunk corridor. Junction anchors are route-planning waypoints, not confirmed trotro stops."
  },
  {
    id: "city-bus-circle-to-labadi",
    name: "Circle – 37 – Osu – Labadi",
    mode: "city_bus",
    waypointNodeIds: ["circle-junction", "37-junction", "osu-junction", "labadi-anchor"],
    serviceNote: "Proposed central/coastal urban bus corridor. Stop locations, service frequency and road access remain unapproved."
  },
  {
    id: "trotro-tetteh-quarshie-to-tema",
    name: "Tetteh Quarshie – Spintex – Tema",
    mode: "trotro",
    waypointNodeIds: ["tetteh-quarshie-interchange", "spintex-junction", "tema-motorway-junction"],
    serviceNote: "Proposed south-eastern connector. Junction anchors are not passenger boarding points."
  },
  {
    id: "shared-taxi-madina-to-adenta",
    name: "Madina – Adenta",
    mode: "shared_taxi",
    waypointNodeIds: ["madina-junction", "adenta-gateway"],
    serviceNote: "Proposed N4 shared-taxi corridor. Rank locations and operating rules require a separate site plan."
  }
] as const;

function buildRoutePlan(definition: RouteDefinition): PublicTransportRoutePlan | null {
  if (definition.waypointNodeIds.length < 2) return null;
  const roadNodeIds: string[] = [definition.waypointNodeIds[0]];
  const roadSegmentIds: string[] = [];
  let distanceM = 0;

  for (let index = 1; index < definition.waypointNodeIds.length; index += 1) {
    const leg = findShortestRoadRoute(
      definition.waypointNodeIds[index - 1],
      definition.waypointNodeIds[index]
    );
    if (!leg || !isRoadRouteValid(leg) || leg.includesFutureExpansion) return null;
    roadNodeIds.push(...leg.nodeIds.slice(1));
    roadSegmentIds.push(...leg.roadSegmentIds);
    distanceM += leg.distanceM;
  }

  return {
    ...definition,
    roadNodeIds,
    roadSegmentIds,
    distanceM,
    status: "planning_only"
  };
}

/**
 * Initial public-transport corridor proposals derived only from connected
 * first-release primary-road graph paths. No stop, fare, timetable, vehicle
 * frequency or operating permit is implied by these route plans.
 */
export const GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS: readonly PublicTransportRoutePlan[] =
  ROUTE_DEFINITIONS.map((definition) => {
    const plan = buildRoutePlan(definition);
    if (!plan) throw new Error("Public transport corridor is disconnected: " + definition.id);
    return plan;
  });

export function getPublicTransportRoutePlan(routeId: string): PublicTransportRoutePlan | undefined {
  return GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.find((route) => route.id === routeId);
}

export function isPublicTransportRoutePlanValid(value: unknown): value is PublicTransportRoutePlan {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<PublicTransportRoutePlan>;
  if (typeof route.id !== "string" || !route.id.trim() ||
      typeof route.name !== "string" || !route.name.trim() ||
      !["trotro", "city_bus", "shared_taxi"].includes(route.mode ?? "") ||
      route.status !== "planning_only" ||
      !Array.isArray(route.waypointNodeIds) || route.waypointNodeIds.length < 2 ||
      !Array.isArray(route.roadNodeIds) || !Array.isArray(route.roadSegmentIds) ||
      route.roadNodeIds.length !== route.roadSegmentIds.length + 1 ||
      route.roadNodeIds[0] !== route.waypointNodeIds[0] ||
      route.roadNodeIds[route.roadNodeIds.length - 1] !== route.waypointNodeIds[route.waypointNodeIds.length - 1] ||
      !Number.isFinite(route.distanceM) || route.distanceM! <= 0 ||
      typeof route.serviceNote !== "string" || !route.serviceNote.trim()) return false;

  if (!route.waypointNodeIds.every((nodeId) => !!getRoadNode(nodeId))) return false;
  let distanceM = 0;
  for (let index = 0; index < route.roadSegmentIds.length; index += 1) {
    const leg = findShortestRoadRoute(route.roadNodeIds[index], route.roadNodeIds[index + 1]);
    if (!leg || !leg.roadSegmentIds.includes(route.roadSegmentIds[index])) return false;
    const segment = leg.roadSegmentIds.find((id) => id === route.roadSegmentIds[index]);
    if (!segment) return false;
    const { GREATER_ACCRA_ROAD_NETWORK } = requireRoadNetwork();
    const road = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === segment);
    if (!road || road.futureExpansion) return false;
    const path = findShortestRoadRoute(route.roadNodeIds[index], route.roadNodeIds[index + 1]);
    if (!path || path.roadSegmentIds.length !== 1) return false;
    distanceM += path.distanceM;
  }
  return distanceM > 0 && Math.abs(distanceM - route.distanceM) < 1e-4;
}

function requireRoadNetwork(): typeof import("./roadNetwork") {
  // Static import-free indirection keeps the validation contract local and pure.
  return requireRoadNetworkModule;
}

import * as requireRoadNetworkModule from "./roadNetwork";

export function isGreaterAccraPublicTransportRouteCatalogueValid(): boolean {
  const ids = GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.map((route) => route.id);
  return ids.length === 4 && new Set(ids).size === ids.length &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.every(isPublicTransportRoutePlanValid);
}
