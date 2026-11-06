import { findShortestRoadRoute, isRoadRouteValid } from "./roadRouting";
import { GREATER_ACCRA_ROAD_PATHS } from "./greaterAccraLayout";
import { findNearestRoadProjection, getRoadLaneCenterOffset, getRoadLaneCenterPoint, isPointOnRoadNetwork, isRoadProjectionValid } from "./roadNavigation";
import { isGreaterAccraMapLayoutValid } from "./greaterAccraLayout";
import { isGreaterAccraRailNetworkValid } from "./railNetwork";
import { isGreaterAccraTrackDesignValid } from "./railTrackDesign";
import { isGreaterAccraRoadDesignCatalogueValid } from "./roadDesign";
import { isPedestrianCrossingLayoutValid } from "./pedestrianCrossingGeometry";
import { getTrafficSignalState, isTrafficSignalPlanValid, mayProceedOnTrafficSignal } from "./trafficSignals";
import {
  advanceRoadVehicleDynamics,
  type RoadVehicleDynamicsConfig,
  type RoadVehicleDynamicsState
} from "../vehicles/roadVehicleDynamics";
import { enterVehicle, exitVehicle, type VehicleInteractionState } from "../vehicles/vehicleInteraction";
import { isVehiclePathClear } from "../vehicles/vehicleCollision";
import {
  alightPublicTransport,
  boardPublicTransport,
  quotePublicTransportFare,
  type PublicTransportPassengerState
} from "./publicTransportOperations";
import {
  advanceRailTrain,
  createRailTrainOperationState,
  isRailTrainOperationConfigValid,
  type RailTrainOperationConfig
} from "./railTrainOperations";
import { createRailServiceConfig } from "./railService";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("Transport smoke check failed: " + message);
}

function expectFailure(result: { ok: true } | { ok: false; reason: string }, reason: string, message: string): void {
  assert(!result.ok && result.reason === reason, message);
}

function expectThrow(action: () => unknown, message: string): void {
  let threw = false;
  try { action(); } catch { threw = true; }
  assert(threw, message);
}

/**
 * Fast deterministic checks for the transport logic used by the playable
 * scene. These are runtime smoke checks, not a substitute for device testing,
 * railway certification, or authoritative multiplayer validation.
 */
export function runTransportSmokeChecks(): void {
  assert(isGreaterAccraMapLayoutValid(), "Greater Accra map nodes, roads and coastline validate");
  assert(isGreaterAccraRailNetworkValid(), "Greater Accra Cape-gauge rail routes and station nodes validate");
  assert(isGreaterAccraTrackDesignValid(), "Greater Accra rail track design assignments validate");
  assert(isGreaterAccraRoadDesignCatalogueValid(), "Greater Accra road cross-section assignments validate");

  const mallamToTema = findShortestRoadRoute("mallam-junction", "tema-motorway-junction");
  assert(!!mallamToTema && isRoadRouteValid(mallamToTema) &&
    mallamToTema.roadSegmentIds.length > 0 && !mallamToTema.includesFutureExpansion,
    "shortest road route connects Mallam to Tema without future expansion stubs");
  assert(findShortestRoadRoute("mallam-junction", "prampram-expansion-gateway") === null,
    "future Prampram gateway is excluded from first-release road routing");
  const futureRoute = findShortestRoadRoute("mallam-junction", "prampram-expansion-gateway",
    { includeFutureExpansion: true });
  assert(!!futureRoute && futureRoute.includesFutureExpansion &&
    isRoadRouteValid(futureRoute, { includeFutureExpansion: true }),
    "future expansion can be previewed when explicitly enabled");
  assert(findShortestRoadRoute("achimota-interchange", "mallam-junction") === null,
    "disconnected primary-road components do not invent a connecting route");

  const firstRoad = GREATER_ACCRA_ROAD_PATHS.find((road) => road.roadSegmentId === "n1-west-approach");
  assert(!!firstRoad, "first-release N1 road path exists for road projection");
  const roadStart = firstRoad.points[0];
  const roadProjection = findNearestRoadProjection(roadStart.x, roadStart.z, { maxDistanceM: 1 });
  assert(!!roadProjection && isRoadProjectionValid(roadProjection) &&
    roadProjection.roadSegmentId === "n1-west-approach" && roadProjection.distanceM < 0.001,
    "road projection finds the exact nearest first-release road centreline");
  assert(!isPointOnRoadNetwork(roadStart.x, roadStart.z, { maxDistanceM: 1 }),
    "a divided-road median is not treated as a drivable lane");
  assert(!isPointOnRoadNetwork(roadStart.x + 500, roadStart.z + 500, { maxDistanceM: 1 }),
    "distant off-road points are not snapped onto the network");
  const forwardLaneOffset = getRoadLaneCenterOffset("n1-west-approach", "forward", 0);
  const reverseLaneOffset = getRoadLaneCenterOffset("n1-west-approach", "reverse", 0);
  assert(forwardLaneOffset > 0 && reverseLaneOffset < 0,
    "opposing traffic directions receive separate lane-centre offsets");
  const laneCentre = getRoadLaneCenterPoint(roadProjection, "forward", 0);
  assert(Number.isFinite(laneCentre.x) && Number.isFinite(laneCentre.z) &&
    isPointOnRoadNetwork(laneCentre.x, laneCentre.z, { maxDistanceM: 10 }),
    "computed lane centres fall inside the drivable carriageway");
  const futureRoad = GREATER_ACCRA_ROAD_PATHS.find((road) => road.roadSegmentId === "n6-nsawam-expansion");
  assert(!!futureRoad, "future Nsawam road stub exists in the planning catalogue");
  const futurePoint = futureRoad.points[1];
  assert(findNearestRoadProjection(futurePoint.x, futurePoint.z, { maxDistanceM: 1 }) === null,
    "future road stubs are excluded from normal road projection");
  const futureProjection = findNearestRoadProjection(futurePoint.x, futurePoint.z,
    { maxDistanceM: 1, includeFutureExpansion: true });
  assert(!!futureProjection && futureProjection.roadSegmentId === "n6-nsawam-expansion" &&
    !futureProjection.playableInFirstRelease,
    "future road stubs can be projected only when explicitly enabled");

  const fare = { baseFarePesewas: 200, perKilometrePesewas: 100 };
  assert(quotePublicTransportFare(0.05, fare) === 205, "fare is quoted in integer pesewas");

  const wallet: PublicTransportPassengerState = { mode: "not_riding", balancePesewas: 1000 };
  const stop = {
    id: "smoke-stop",
    vehicleStopped: true,
    boardingOpen: true,
    alightingOpen: false,
    remainingSeats: 4
  };
  const boarded = boardPublicTransport(wallet, stop, "smoke-trotro", "smoke-route", 0.05, fare);
  assert(boarded.ok && boarded.state.mode === "riding", "passenger can board a stopped service");
  if (!boarded.ok || boarded.state.mode !== "riding") throw new Error("Boarding assertion narrowed unexpectedly.");
  assert(boarded.state.balancePesewas === 795 && boarded.state.farePaidPesewas === 205,
    "boarding deducts the exact fare once");
  expectFailure(boardPublicTransport(boarded.state, stop, "other", "route", 1, fare), "already_riding", "passenger cannot board twice");
  expectFailure(boardPublicTransport(wallet, { ...stop, vehicleStopped: false }, "v", "r", 1, fare), "vehicle_not_stopped", "moving vehicles reject boarding");
  expectFailure(boardPublicTransport(wallet, { ...stop, remainingSeats: 0 }, "v", "r", 1, fare), "no_seats", "full vehicles reject boarding");
  expectFailure(boardPublicTransport({ mode: "not_riding", balancePesewas: 1 }, stop, "v", "r", 1, fare), "insufficient_funds", "insufficient wallet balance rejects boarding");
  expectFailure(alightPublicTransport(boarded.state, { ...stop, vehicleStopped: false, alightingOpen: true }, "smoke-trotro"), "vehicle_not_stopped", "passenger cannot alight while moving");
  expectFailure(alightPublicTransport(boarded.state, { ...stop, vehicleStopped: true, alightingOpen: true }, "wrong-vehicle"), "wrong_vehicle", "passenger cannot alight from a different vehicle");
  const alighted = alightPublicTransport(boarded.state, { ...stop, vehicleStopped: true, alightingOpen: true }, "smoke-trotro");
  assert(alighted.ok && alighted.state.mode === "not_riding" && alighted.state.balancePesewas === 795,
    "passenger can alight and retains the correct balance");
  const secondTrip = boardPublicTransport(alighted.state, stop, "smoke-train", "smoke-rail", 0.04,
    { baseFarePesewas: 300, perKilometrePesewas: 100 });
  assert(secondTrip.ok && secondTrip.state.mode === "riding" && secondTrip.state.balancePesewas === 491,
    "the same wallet carries its remaining balance into a second transport mode");

  let interaction: VehicleInteractionState = { mode: "on_foot" };
  const vehicle = {
    id: "smoke-car", enabled: true, speedMps: 0, distanceToEntryM: 1,
    driverSeatAvailable: true, passengerSeatsAvailable: 2, safeExitAvailable: true
  };
  const entered = enterVehicle(interaction, vehicle, "driver");
  assert(entered.ok && entered.state.mode === "inside_vehicle", "player can enter an available nearby car");
  if (!entered.ok) throw new Error("Vehicle entry assertion narrowed unexpectedly.");
  interaction = entered.state;
  expectFailure(exitVehicle(interaction, { ...vehicle, speedMps: 1 }), "vehicle_moving", "player cannot exit a moving car");
  expectFailure(exitVehicle(interaction, { ...vehicle, safeExitAvailable: false }), "unsafe_exit", "player cannot exit into an unsafe space");
  const exited = exitVehicle(interaction, vehicle);
  assert(exited.ok && exited.state.mode === "on_foot", "player can exit a stopped car safely");
  expectFailure(enterVehicle({ mode: "on_foot" }, { ...vehicle, distanceToEntryM: 20 }, "driver"), "too_far", "vehicle entry distance is enforced");

  assert(isVehiclePathClear(
    { x: 0, z: 0, radiusM: 2 },
    { x: 0, z: 2, radiusM: 2 },
    { x: 10, z: 0, radiusM: 2 }
  ), "separated vehicles retain a clear path");
  assert(!isVehiclePathClear(
    { x: -10, z: 0, radiusM: 2 },
    { x: 10, z: 0, radiusM: 2 },
    { x: 0, z: 0, radiusM: 2 }
  ), "swept vehicle collision catches a crossing even when endpoints are clear");
  expectThrow(() => isVehiclePathClear(
    { x: 0, z: 0, radiusM: 0 },
    { x: 0, z: 1, radiusM: 2 },
    { x: 5, z: 0, radiusM: 2 }
  ), "invalid vehicle collision footprints are rejected");

  const dynamicsConfig: RoadVehicleDynamicsConfig = {
    wheelbaseM: 2.8, maximumForwardSpeedMps: 7, maximumReverseSpeedMps: 2,
    maximumAccelerationMps2: 1.8, serviceBrakingMps2: 4,
    maximumSteeringAngleRadians: 0.35, rollingDragMps2: 0.3
  };
  const initialVehicle: RoadVehicleDynamicsState = { x: 0, z: 0, headingRadians: 0, speedMps: 0 };
  const movingVehicle = advanceRoadVehicleDynamics(dynamicsConfig, initialVehicle,
    { throttle: 1, brake: 0, steering: 0 }, 0.1);
  assert(movingVehicle.speedMps > 0 && movingVehicle.z > 0,
    "road vehicle accelerates along its forward axis");
  const stoppedVehicle = advanceRoadVehicleDynamics(dynamicsConfig, movingVehicle,
    { throttle: 0, brake: 1, steering: 0 }, 0.1);
  assert(stoppedVehicle.speedMps === 0, "service brake can bring a low-speed vehicle to a stop");
  expectThrow(() => advanceRoadVehicleDynamics(dynamicsConfig, initialVehicle,
    { throttle: 2, brake: 0, steering: 0 }, 0.1), "invalid road vehicle input is rejected");

  const crossingLayout = {
    id: "smoke-crossing", centre: { x: 0, z: 0 }, acrossDirection: { x: 1, z: 0 },
    crossingWidthM: 8, crossingDepthM: 4, stripeCount: 8, stripeWidthM: 0.65,
    tactilePavingDepthM: 0.8, status: "planned" as const
  };
  assert(isPedestrianCrossingLayoutValid(crossingLayout), "pedestrian crossing layout validates");
  assert(!isPedestrianCrossingLayoutValid({ ...crossingLayout, acrossDirection: { x: 2, z: 0 } }),
    "non-unit crossing direction is rejected");
  assert(!isPedestrianCrossingLayoutValid({ ...crossingLayout, stripeCount: 20 }),
    "crosswalk stripes cannot exceed the available crossing width");

  const signalPlan = { id: "smoke-signal", greenSeconds: 20, amberSeconds: 3, redSeconds: 25, offsetSeconds: 0, status: "planned" as const };
  assert(isTrafficSignalPlanValid(signalPlan), "traffic signal plan validates");
  assert(getTrafficSignalState(signalPlan, 0).phase === "green", "signal begins in green phase");
  assert(getTrafficSignalState(signalPlan, 20).phase === "amber", "signal changes to amber at the configured boundary");
  assert(getTrafficSignalState(signalPlan, 23).phase === "red", "signal changes to red after amber");
  assert(getTrafficSignalState(signalPlan, 48).phase === "green", "signal cycle repeats deterministically");
  const negativeSignalTime = getTrafficSignalState(signalPlan, -1);
  assert(negativeSignalTime.phase === "red" && negativeSignalTime.cyclePositionSeconds === 47,
    "negative simulation time wraps to the equivalent position at the end of the cycle");
  assert(mayProceedOnTrafficSignal("green", true), "protected movement may proceed on green");
  assert(!mayProceedOnTrafficSignal("amber", true) && !mayProceedOnTrafficSignal("green", false), "amber and unprotected conflicting movements cannot proceed");
  expectThrow(() => getTrafficSignalState(signalPlan, Number.NaN), "invalid signal simulation time is rejected");

  const mappedAccraTrunk = createRailServiceConfig("accra-odaw-achimota");
  assert(mappedAccraTrunk.path.length >= 2 && mappedAccraTrunk.stops.length === 0,
    "mapped Accra–Odaw–Achimota train passes the candidate Odaw corridor without inventing a station stop");
  const mappedTemaBranch = createRailServiceConfig("achimota-to-tema");
  assert(mappedTemaBranch.stops.length === 1 && mappedTemaBranch.stops[0].id === "tema-rail-station",
    "mapped Achimota–Tema train stops only at the planned Tema terminal");
  expectThrow(() => createRailServiceConfig("achimota-to-nsawam"),
    "future Nsawam rail expansion cannot become a first-release service");

  const railConfig: RailTrainOperationConfig = {
    path: [{ x: 0, z: 0 }, { x: 0, z: 20 }],
    stops: [{ id: "smoke-platform", distanceM: 5, dwellSeconds: 2 }],
    maximumSpeedMps: 6, accelerationMps2: 1.2, serviceBrakingMps2: 1.6
  };
  assert(isRailTrainOperationConfigValid(railConfig), "rail route and station stop configuration is valid");
  let railState = createRailTrainOperationState();
  let sawDwell = false;
  for (let frame = 0; frame < 600 && !railState.completed; frame += 1) {
    const next = advanceRailTrain(railConfig, railState, 0.1);
    railState = next.state;
    if (railState.currentStopId === "smoke-platform" || railState.dwellRemainingSeconds > 0) sawDwell = true;
  }
  assert(sawDwell, "train stops and dwells at the configured platform");
  assert(railState.completed && railState.speedMps === 0 && railState.distanceM === 20,
    "train reaches its terminal and stops");
  expectThrow(() => advanceRailTrain(railConfig, railState, 1.1),
    "rail simulation rejects an oversized frame step");
}
