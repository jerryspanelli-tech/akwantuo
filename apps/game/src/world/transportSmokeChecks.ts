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
import { advanceWatercraftDynamics, WATERCRAFT_CONFIG, AKWAABA_CAY_WATER_ROUTE, isWatercraftInNavigableSea } from "../vehicles/watercraftDynamics";
import { advanceMotorcycleDynamics, isMotorcycleDynamicsConfigValid, isMotorcycleDynamicsStateValid } from "../vehicles/motorcycleDynamics";
import { getRoadVehicleAutopilotControl, isRoadVehicleAutopilotConfigValid } from "../vehicles/roadVehicleAutopilot";
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
import { createRailServiceConfig, createRailServiceConfigForRouteChain } from "./railService";
import { deriveRailRoadCrossingCandidates, evaluateRailCrossingSafety, isRailRoadCrossingCatalogueValid } from "./railRoadCrossings";
import { GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS, isGreaterAccraPublicTransportRouteCatalogueValid } from "./publicTransportRoutes";
import { isBuildingCatalogueValid, DISTRICT_BUILDINGS } from "./ghanaianStreetBuildings";
import { isDistrictPropertyCatalogueValid } from "./districtProperties";
import { INTERIOR_BLUEPRINTS, isInteriorBlueprintCatalogueValid } from "./interiorBlueprints";

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
  assert(isBuildingCatalogueValid(), "Ghanaian building footprints are unique, non-overlapping and clear of every playable primary-road corridor");
  assert(isDistrictPropertyCatalogueValid(), "district property records match buildings and cannot grant client-side ownership");
  assert(isInteriorBlueprintCatalogueValid(), "business, home and convenience-store interior plans have valid dimensions and fixture placements");
  const interiorIds = new Set(INTERIOR_BLUEPRINTS.map((blueprint) => blueprint.id));
  assert(DISTRICT_BUILDINGS.every((building) => !building.interiorId || interiorIds.has(building.interiorId)),
    "every advertised building interior resolves to a known interior blueprint");
  assert(isGreaterAccraMapLayoutValid(), "Greater Accra map nodes, roads and coastline validate");
  assert(isGreaterAccraRailNetworkValid(), "Greater Accra Cape-gauge rail routes and station nodes validate");
  assert(isGreaterAccraTrackDesignValid(), "Greater Accra rail track design assignments validate");
  assert(isGreaterAccraRoadDesignCatalogueValid(), "Greater Accra road cross-section assignments validate");
  assert(isGreaterAccraPublicTransportRouteCatalogueValid() &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.length === 4,
    "Greater Accra proposed public transport corridors validate against the primary-road graph");
  assert(GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.every((route) =>
    route.status === "planning_only" && route.distanceM > 0 &&
    route.waypointNodeIds.length >= 2 && route.roadSegmentIds.length > 0),
    "public transport corridor plans contain connected road paths and remain explicitly planning-only");
  assert(GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.some((route) => route.mode === "trotro") &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.some((route) => route.mode === "city_bus") &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.some((route) => route.mode === "shared_taxi"),
    "proposed transport corridors cover trotro, city bus and shared taxi modes");
  const railCrossings = deriveRailRoadCrossingCandidates();
  assert(isRailRoadCrossingCatalogueValid() && railCrossings.length === 4,
    "four schematic at-grade road/rail crossing candidates are derived outside Circle and Achimota grade-separated junctions");
  assert(railCrossings.some((crossing) => crossing.roadSegmentId === "n1-tema-corridor") &&
    railCrossings.some((crossing) => crossing.roadSegmentId === "liberation-road") &&
    railCrossings.some((crossing) => crossing.roadSegmentId === "spintex-road") &&
    railCrossings.some((crossing) => crossing.roadSegmentId === "spintex-tema-connection") &&
    railCrossings.some((crossing) => crossing.geometryReview === "shallow_angle"),
    "crossing candidates identify the authored road corridors and flag the shallow Spintex–Tema intersection for geometry review");
  const crossingClear = evaluateRailCrossingSafety({
    trainFrontDistanceM: null, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 500, systemHealthy: true
  });
  const crossingWarning = evaluateRailCrossingSafety({
    trainFrontDistanceM: 400, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 500, systemHealthy: true
  });
  const crossingOccupied = evaluateRailCrossingSafety({
    trainFrontDistanceM: -60, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 500, systemHealthy: true
  });
  const crossingClearOfRear = evaluateRailCrossingSafety({
    trainFrontDistanceM: -136, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 500, systemHealthy: true
  });
  const crossingFault = evaluateRailCrossingSafety({
    trainFrontDistanceM: null, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 500, systemHealthy: false
  });
  assert(crossingClear.phase === "open" && crossingClear.roadTrafficMayProceed,
    "clear rail crossing permits road traffic");
  assert(crossingWarning.phase === "warning" && !crossingWarning.roadTrafficMayProceed,
    "approaching train warns and blocks road entry before the crossing");
  assert(crossingOccupied.phase === "closed" && crossingOccupied.barriersDown &&
    !crossingOccupied.roadTrafficMayProceed,
    "crossing remains closed while the train occupies it");
  assert(crossingClearOfRear.phase === "open" && crossingClearOfRear.roadTrafficMayProceed,
    "crossing reopens only after the train rear and clearance distance pass");
  assert(crossingFault.phase === "closed" && crossingFault.barriersDown &&
    !crossingFault.roadTrafficMayProceed,
    "crossing interlock fails safe to closed on a system fault");
  expectThrow(() => evaluateRailCrossingSafety({
    trainFrontDistanceM: 100, trainLengthM: 120, clearanceM: 15,
    warningDistanceM: 100, systemHealthy: true
  }), "invalid rail crossing warning distance is rejected");

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
  const circleToOfankor = findShortestRoadRoute("circle-junction", "ofankor-junction");
  assert(!!circleToOfankor && isRoadRouteValid(circleToOfankor) &&
    circleToOfankor.roadSegmentIds.includes("n6-circle-caprice") &&
    circleToOfankor.roadSegmentIds.includes("n6-achimota-ofankor"),
    "N6 connects Circle through Caprice, Alajo, Apenkwa and Achimota to Ofankor");
  const achimotaToMallam = findShortestRoadRoute("achimota-interchange", "mallam-junction");
  assert(!!achimotaToMallam && isRoadRouteValid(achimotaToMallam) &&
    achimotaToMallam.roadSegmentIds.length > 0,
    "the N6 and N1 form a connected Achimota-to-Mallam primary-road route");

  const firstRoad = GREATER_ACCRA_ROAD_PATHS.find((road) => road.roadSegmentId === "n1-west-approach");
  assert(!!firstRoad, "first-release N1 road path exists for road projection");
  const roadStart = firstRoad.points[0];
  const roadProjection = findNearestRoadProjection(roadStart.x, roadStart.z, { maxDistanceM: 1 });
  assert(!!roadProjection && isRoadProjectionValid(roadProjection) &&
    roadProjection.roadSegmentId === "n1-west-approach" && roadProjection.distanceM < 0.001,
    "road projection finds the exact nearest first-release road centreline");
  const segmentProjection = findNearestRoadProjection(roadStart.x, roadStart.z, {
    maxDistanceM: 1,
    roadSegmentId: firstRoad.roadSegmentId
  });
  assert(!!segmentProjection && segmentProjection.roadSegmentId === firstRoad.roadSegmentId,
    "road-specific projection remains on the requested corridor");
  expectThrow(() => findNearestRoadProjection(roadStart.x, roadStart.z, {
    maxDistanceM: 1,
    roadSegmentId: " "
  }), "empty road-segment projection filters are rejected");
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
  const speedboatStart = { x: 2700, z: -3380, headingRadians: Math.PI / 2, speedMps: 0 };
  assert(isWatercraftInNavigableSea(speedboatStart) && AKWAABA_CAY_WATER_ROUTE.length >= 4 &&
    AKWAABA_CAY_WATER_ROUTE.every((point) => isWatercraftInNavigableSea({ ...point, headingRadians: 0, speedMps: 0 })),
    "Labadi marina to Akwaaba Cay route stays inside the navigable Gulf of Guinea water area");
  const speedboatMoving = advanceWatercraftDynamics(WATERCRAFT_CONFIG.speedboat, speedboatStart,
    { throttle: 1, steering: 0, brake: 0 }, 0.1);
  assert(speedboatMoving.speedMps > 0 && speedboatMoving.x > speedboatStart.x,
    "speedboat accelerates along its forward heading");
  const jetSkiTurning = advanceWatercraftDynamics(WATERCRAFT_CONFIG.jet_ski,
    { ...speedboatStart, headingRadians: 0, speedMps: 8 },
    { throttle: 0.5, steering: 1, brake: 0 }, 0.1);
  assert(jetSkiTurning.headingRadians > 0 && jetSkiTurning.speedMps > 8,
    "jet ski accelerates and steers through a turn");
  const watercraftStopped = advanceWatercraftDynamics(WATERCRAFT_CONFIG.speedboat,
    { ...speedboatMoving, speedMps: 0.4 },
    { throttle: 0, steering: 0, brake: 1 }, 0.1);
  assert(watercraftStopped.speedMps === 0, "watercraft brake stops a slow-moving craft");
  expectThrow(() => advanceWatercraftDynamics(WATERCRAFT_CONFIG.speedboat, speedboatStart,
    { throttle: 2, steering: 0, brake: 0 }, 0.1), "invalid watercraft throttle is rejected");
  const motorcycleConfig = {
    wheelbaseM: 1.4,
    maximumForwardSpeedMps: 32,
    maximumReverseSpeedMps: 2,
    maximumAccelerationMps2: 4,
    serviceBrakingMps2: 7,
    maximumSteeringAngleRadians: 0.45,
    maximumLeanAngleRadians: 0.61,
    gravityMps2: 9.81,
    rollingDragMps2: 0.25
  };
  const motorcycleStart = { x: 0, z: 0, headingRadians: 0, speedMps: 0, leanAngleRadians: 0 };
  assert(isMotorcycleDynamicsConfigValid(motorcycleConfig) &&
    isMotorcycleDynamicsStateValid(motorcycleStart, motorcycleConfig),
    "motorcycle steering and lean configuration validates");
  const motorcycleTurning = advanceMotorcycleDynamics(
    motorcycleConfig, motorcycleStart, { throttle: 1, brake: 0, steering: 0.8 }, 0.2
  );
  assert(motorcycleTurning.speedMps > 0 && motorcycleTurning.headingRadians > 0 &&
    motorcycleTurning.leanAngleRadians > 0,
    "motorcycle accelerates, steers and leans into a turn");
  const motorcycleFastTurn = advanceMotorcycleDynamics(
    motorcycleConfig,
    { ...motorcycleStart, speedMps: 28 },
    { throttle: 0, brake: 0, steering: 1 },
    0.1
  );
  assert(Math.abs(motorcycleFastTurn.leanAngleRadians) <= motorcycleConfig.maximumLeanAngleRadians &&
    isMotorcycleDynamicsStateValid(motorcycleFastTurn, motorcycleConfig),
    "motorcycle lean remains bounded during a high-speed turn");
  const motorcycleBraking = advanceMotorcycleDynamics(
    motorcycleConfig, { ...motorcycleTurning, speedMps: 0.8 },
    { throttle: 0, brake: 1, steering: 0 },
    0.1
  );
  assert(motorcycleBraking.speedMps < 0.8,
    "motorcycle service braking reduces forward speed");
  expectThrow(() => advanceMotorcycleDynamics(
    motorcycleConfig, motorcycleStart, { throttle: 0, brake: 0, steering: 2 }, 0.1
  ), "invalid motorcycle steering input is rejected");
  const autopilotConfig = {
    wheelbaseM: 2.65,
    maximumSteeringAngleRadians: 0.48,
    targetSpeedMps: 8,
    baseLookaheadM: 6,
    speedLookaheadFactor: 0.5,
    throttleGain: 0.3,
    brakeGain: 0.5
  };
  const straightRoute = [{ x: 0, z: 0 }, { x: 0, z: 100 }];
  assert(isRoadVehicleAutopilotConfigValid(autopilotConfig),
    "road vehicle pure-pursuit configuration validates");
  const straightControl = getRoadVehicleAutopilotControl(
    autopilotConfig, { x: 0, z: 0, headingRadians: 0, speedMps: 0 }, straightRoute
  );
  assert(straightControl.throttle === 1 && straightControl.brake === 0 &&
    Math.abs(straightControl.steering) < 1e-6 && straightControl.crossTrackErrorM < 1e-6,
    "autopilot accelerates along a straight route without steering drift");
  const recoveryControl = getRoadVehicleAutopilotControl(
    autopilotConfig, { x: 5, z: 10, headingRadians: 0, speedMps: 5 }, straightRoute
  );
  assert(recoveryControl.steering < 0 && recoveryControl.crossTrackErrorM > 4,
    "autopilot steers back toward the route centreline when laterally displaced");
  const curveControl = getRoadVehicleAutopilotControl(
    autopilotConfig,
    { x: 0, z: 15, headingRadians: 0, speedMps: 6 },
    [{ x: 0, z: 0 }, { x: 0, z: 20 }, { x: 20, z: 40 }]
  );
  assert(curveControl.steering > 0,
    "pure-pursuit controller steers into a curved road path");
  const overspeedControl = getRoadVehicleAutopilotControl(
    autopilotConfig, { x: 0, z: 10, headingRadians: 0, speedMps: 10 }, straightRoute
  );
  assert(overspeedControl.brake > 0 && overspeedControl.throttle === 0,
    "autopilot brakes when vehicle exceeds its target speed");
  expectThrow(() => getRoadVehicleAutopilotControl(
    autopilotConfig,
    { x: 0, z: 0, headingRadians: 0, speedMps: 0 },
    [{ x: 0, z: 0 }, { x: 0, z: 0 }]
  ), "autopilot rejects zero-length route segments");

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
  const mappedAccraToTema = createRailServiceConfigForRouteChain(["accra-odaw-achimota", "achimota-to-tema"]);
  assert(mappedAccraToTema.path.length === 13 && mappedAccraToTema.stops.length === 1 &&
    mappedAccraToTema.stops[0].id === "tema-rail-station",
    "connected Accra–Tema route chain passes Odaw and Achimota and stops only at Tema");
  expectThrow(() => createRailServiceConfigForRouteChain(["achimota-to-tema", "accra-odaw-achimota"]),
    "disconnected or reversed rail route chains are rejected");
  let mappedRailState = createRailTrainOperationState();
  let mappedRailSawTemaDwell = false;
  let mappedRailTerminalState: ReturnType<typeof createRailTrainOperationState> | null = null;
  for (let frame = 0; frame < 2000 && !mappedRailState.completed; frame += 1) {
    mappedRailState = advanceRailTrain(mappedAccraToTema, mappedRailState, 1).state;
    if (mappedRailState.currentStopId === "tema-rail-station" ||
        mappedRailState.dwellRemainingSeconds > 0) {
      mappedRailSawTemaDwell = true;
      mappedRailTerminalState = mappedRailState;
    }
  }
  assert(mappedRailSawTemaDwell && mappedRailTerminalState !== null &&
    mappedRailTerminalState.speedMps === 0 && mappedRailTerminalState.dwellRemainingSeconds > 0 &&
    mappedRailState.completed && mappedRailState.distanceM > 10000 && mappedRailState.speedMps === 0,
    "mapped Accra-to-Tema train traverses the connected route and dwells at the Tema terminal");
  expectThrow(() => createRailServiceConfig("achimota-to-nsawam"),
    "future Nsawam rail expansion cannot become a first-release service");
  const mappedRailPassenger = boardPublicTransport(
    { mode: "not_riding", balancePesewas: 10000 },
    { id: "accra-central-rail-station", vehicleStopped: true, boardingOpen: true, alightingOpen: false, remainingSeats: 80 },
    "greater-accra-mapped-rail-train",
    "accra-central-tema",
    0.1,
    { baseFarePesewas: 0, perKilometrePesewas: 0 }
  );
  assert(mappedRailPassenger.ok && mappedRailPassenger.state.mode === "riding" &&
    mappedRailPassenger.state.vehicleId === "greater-accra-mapped-rail-train" &&
    mappedRailPassenger.state.balancePesewas === 10000,
    "passenger can board the mapped Accra Central–Tema train without inventing an unapproved preview fare");
  if (!mappedRailPassenger.ok || mappedRailPassenger.state.mode !== "riding") {
    throw new Error("Mapped rail boarding assertion narrowed unexpectedly.");
  }
  const mappedRailAlight = alightPublicTransport(
    mappedRailPassenger.state,
    {
      id: "tema-rail-station",
      vehicleStopped: mappedRailTerminalState !== null && mappedRailTerminalState.speedMps <= 0.01,
      boardingOpen: false,
      alightingOpen: mappedRailTerminalState !== null &&
        (mappedRailTerminalState.currentStopId === "tema-rail-station" ||
          mappedRailTerminalState.dwellRemainingSeconds > 0),
      remainingSeats: 0
    },
    "greater-accra-mapped-rail-train"
  );
  assert(mappedRailAlight.ok && mappedRailAlight.state.mode === "not_riding" &&
    mappedRailAlight.state.balancePesewas === 10000,
    "passenger can alight from the mapped Accra–Tema train at its planned terminal");

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
