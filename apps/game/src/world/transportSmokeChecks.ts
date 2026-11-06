import {
  advanceRoadVehicleDynamics,
  type RoadVehicleDynamicsConfig,
  type RoadVehicleDynamicsState
} from "../vehicles/roadVehicleDynamics";
import { enterVehicle, exitVehicle, type VehicleInteractionState } from "../vehicles/vehicleInteraction";
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("Transport smoke check failed: " + message);
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
  assert(!boardPublicTransport(boarded.state, stop, "other", "route", 1, fare).ok && boardPublicTransport(boarded.state, stop, "other", "route", 1, fare).reason === "already_riding",
    "passenger cannot board twice");
  assert(!boardPublicTransport(wallet, { ...stop, vehicleStopped: false }, "v", "r", 1, fare).ok && boardPublicTransport(wallet, { ...stop, vehicleStopped: false }, "v", "r", 1, fare).reason === "vehicle_not_stopped",
    "moving vehicles reject boarding");
  assert(!boardPublicTransport(wallet, { ...stop, remainingSeats: 0 }, "v", "r", 1, fare).ok && boardPublicTransport(wallet, { ...stop, remainingSeats: 0 }, "v", "r", 1, fare).reason === "no_seats",
    "full vehicles reject boarding");
  assert(!boardPublicTransport({ mode: "not_riding", balancePesewas: 1 }, stop, "v", "r", 1, fare).ok && boardPublicTransport({ mode: "not_riding", balancePesewas: 1 }, stop, "v", "r", 1, fare).reason === "insufficient_funds",
    "insufficient wallet balance rejects boarding");
  assert(!alightPublicTransport(boarded.state, { ...stop, vehicleStopped: false, alightingOpen: true }, "smoke-trotro").ok && alightPublicTransport(boarded.state, { ...stop, vehicleStopped: false, alightingOpen: true }, "smoke-trotro").reason === "vehicle_not_stopped",
    "passenger cannot alight while moving");
  assert(!alightPublicTransport(boarded.state, { ...stop, vehicleStopped: true, alightingOpen: true }, "wrong-vehicle").ok && alightPublicTransport(boarded.state, { ...stop, vehicleStopped: true, alightingOpen: true }, "wrong-vehicle").reason === "wrong_vehicle",
    "passenger cannot alight from a different vehicle");
  const alighted = alightPublicTransport(boarded.state, { ...stop, vehicleStopped: true, alightingOpen: true }, "smoke-trotro");
  assert(alighted.ok && alighted.state.mode === "not_riding" && alighted.state.balancePesewas === 795,
    "passenger can alight and retains the correct balance");

  let interaction: VehicleInteractionState = { mode: "on_foot" };
  const vehicle = {
    id: "smoke-car", enabled: true, speedMps: 0, distanceToEntryM: 1,
    driverSeatAvailable: true, passengerSeatsAvailable: 2, safeExitAvailable: true
  };
  const entered = enterVehicle(interaction, vehicle, "driver");
  assert(entered.ok && entered.state.mode === "inside_vehicle", "player can enter an available nearby car");
  if (!entered.ok) throw new Error("Vehicle entry assertion narrowed unexpectedly.");
  interaction = entered.state;
  assert(!exitVehicle(interaction, { ...vehicle, speedMps: 1 }).ok && exitVehicle(interaction, { ...vehicle, speedMps: 1 }).reason === "vehicle_moving",
    "player cannot exit a moving car");
  assert(!exitVehicle(interaction, { ...vehicle, safeExitAvailable: false }).ok && exitVehicle(interaction, { ...vehicle, safeExitAvailable: false }).reason === "unsafe_exit",
    "player cannot exit into an unsafe space");
  const exited = exitVehicle(interaction, vehicle);
  assert(exited.ok && exited.state.mode === "on_foot", "player can exit a stopped car safely");
  assert(!enterVehicle({ mode: "on_foot" }, { ...vehicle, distanceToEntryM: 20 }, "driver").ok && enterVehicle({ mode: "on_foot" }, { ...vehicle, distanceToEntryM: 20 }, "driver").reason === "too_far",
    "vehicle entry distance is enforced");

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
