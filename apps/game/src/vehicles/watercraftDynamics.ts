export type WatercraftKind = "speedboat" | "jet_ski";

export type WatercraftDynamicsConfig = Readonly<{
  maximumForwardSpeedMps: number;
  maximumReverseSpeedMps: number;
  accelerationMps2: number;
  brakingMps2: number;
  steeringAtSpeedRadians: number;
  dragMps2: number;
}>;

export type WatercraftDynamicsState = Readonly<{
  x: number;
  z: number;
  headingRadians: number;
  speedMps: number;
}>;

export type WatercraftControlInput = Readonly<{
  throttle: number;
  steering: number;
  brake: number;
}>;

export const WATERCRAFT_CONFIG: Readonly<Record<WatercraftKind, WatercraftDynamicsConfig>> = {
  speedboat: {
    maximumForwardSpeedMps: 22,
    maximumReverseSpeedMps: 3,
    accelerationMps2: 2.8,
    brakingMps2: 4.2,
    steeringAtSpeedRadians: 0.55,
    dragMps2: 0.38
  },
  jet_ski: {
    maximumForwardSpeedMps: 26,
    maximumReverseSpeedMps: 2,
    accelerationMps2: 4.1,
    brakingMps2: 5,
    steeringAtSpeedRadians: 0.82,
    dragMps2: 0.52
  }
};

export const AKWAABA_CAY_WATER_ROUTE = [
  { x: 2700, z: -3380 },
  { x: 3900, z: -3570 },
  { x: 5250, z: -3860 },
  { x: 6400, z: -4080 },
  { x: 7145, z: -4215 }
] as const;

export function advanceWatercraftDynamics(
  config: WatercraftDynamicsConfig,
  state: WatercraftDynamicsState,
  input: WatercraftControlInput,
  deltaSeconds: number
): WatercraftDynamicsState {
  if (![config.maximumForwardSpeedMps, config.maximumReverseSpeedMps,
    config.accelerationMps2, config.brakingMps2, config.steeringAtSpeedRadians,
    config.dragMps2, state.x, state.z, state.headingRadians, state.speedMps,
    input.throttle, input.steering, input.brake, deltaSeconds].every(Number.isFinite) ||
    config.maximumForwardSpeedMps <= 0 || config.maximumReverseSpeedMps <= 0 ||
    config.accelerationMps2 <= 0 || config.brakingMps2 <= 0 ||
    config.steeringAtSpeedRadians <= 0 || config.steeringAtSpeedRadians >= Math.PI / 2 ||
    config.dragMps2 < 0 || Math.abs(input.throttle) > 1 ||
    Math.abs(input.steering) > 1 || input.brake < 0 || input.brake > 1 ||
    deltaSeconds < 0 || deltaSeconds > 0.1) {
    throw new Error("Invalid watercraft configuration, state, input or time step.");
  }

  let acceleration = input.throttle * config.accelerationMps2;
  if (input.brake > 0) {
    acceleration = state.speedMps === 0 ? 0 : -Math.sign(state.speedMps) * config.brakingMps2 * input.brake;
  } else if (input.throttle === 0 && state.speedMps !== 0) {
    acceleration = -Math.sign(state.speedMps) * Math.min(config.dragMps2, Math.abs(state.speedMps) / Math.max(deltaSeconds, 0.001));
  }

  let speedMps = state.speedMps + acceleration * deltaSeconds;
  if (input.brake > 0 && Math.sign(speedMps) !== Math.sign(state.speedMps)) speedMps = 0;
  speedMps = Math.max(-config.maximumReverseSpeedMps, Math.min(config.maximumForwardSpeedMps, speedMps));

  const steeringAngle = input.steering * config.steeringAtSpeedRadians;
  const yawRate = speedMps * Math.tan(steeringAngle) / 4.2;
  const headingRadians = state.headingRadians + yawRate * deltaSeconds;
  const averageSpeed = (state.speedMps + speedMps) / 2;
  const travelHeading = state.headingRadians + (headingRadians - state.headingRadians) / 2;

  return {
    x: state.x + Math.sin(travelHeading) * averageSpeed * deltaSeconds,
    z: state.z + Math.cos(travelHeading) * averageSpeed * deltaSeconds,
    headingRadians,
    speedMps
  };
}

export function isWatercraftInNavigableSea(state: WatercraftDynamicsState): boolean {
  return Number.isFinite(state.x) && Number.isFinite(state.z) &&
    state.x >= -8200 && state.x <= 13200 &&
    state.z >= -10400 && state.z <= -3310;
}
