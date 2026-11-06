export type RoadVehicleDynamicsConfig = Readonly<{
  wheelbaseM: number;
  maximumForwardSpeedMps: number;
  maximumReverseSpeedMps: number;
  maximumAccelerationMps2: number;
  serviceBrakingMps2: number;
  maximumSteeringAngleRadians: number;
  rollingDragMps2: number;
}>;

export type RoadVehicleControlInput = Readonly<{
  throttle: number;
  brake: number;
  steering: number;
}>;

export type RoadVehicleDynamicsState = Readonly<{
  x: number;
  z: number;
  headingRadians: number;
  speedMps: number;
}>;

export function isRoadVehicleDynamicsConfigValid(
  config: RoadVehicleDynamicsConfig
): boolean {
  return [
    config.wheelbaseM,
    config.maximumForwardSpeedMps,
    config.maximumReverseSpeedMps,
    config.maximumAccelerationMps2,
    config.serviceBrakingMps2,
    config.maximumSteeringAngleRadians,
    config.rollingDragMps2
  ].every(Number.isFinite) &&
    config.wheelbaseM > 0 &&
    config.maximumForwardSpeedMps > 0 &&
    config.maximumReverseSpeedMps > 0 &&
    config.maximumAccelerationMps2 > 0 &&
    config.serviceBrakingMps2 > 0 &&
    config.maximumSteeringAngleRadians > 0 &&
    config.maximumSteeringAngleRadians < Math.PI / 2 &&
    config.rollingDragMps2 >= 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Lightweight kinematic bicycle model for local road-vehicle prototypes.
 * Inputs are normalised to [-1, 1] for throttle/steering and [0, 1] for brake.
 * This is not a tyre, suspension, crash or production vehicle-physics model.
 */
export function advanceRoadVehicleDynamics(
  config: RoadVehicleDynamicsConfig,
  state: RoadVehicleDynamicsState,
  input: RoadVehicleControlInput,
  deltaSeconds: number
): RoadVehicleDynamicsState {
  if (!isRoadVehicleDynamicsConfigValid(config)) {
    throw new Error("Invalid road vehicle dynamics configuration.");
  }
  if (![state.x, state.z, state.headingRadians, state.speedMps,
    input.throttle, input.brake, input.steering, deltaSeconds].every(Number.isFinite) ||
      Math.abs(input.throttle) > 1 ||
      input.brake < 0 || input.brake > 1 ||
      Math.abs(input.steering) > 1 ||
      deltaSeconds < 0 || deltaSeconds > 0.1) {
    throw new Error("Invalid road vehicle state, input or time step.");
  }

  const throttle = clamp(input.throttle, -1, 1);
  const brake = clamp(input.brake, 0, 1);
  let acceleration = throttle * config.maximumAccelerationMps2;

  if (brake > 0) {
    const brakingDirection = state.speedMps === 0
      ? 0
      : -Math.sign(state.speedMps);
    acceleration = brakingDirection * config.serviceBrakingMps2 * brake;
  } else if (throttle === 0 && state.speedMps !== 0) {
    acceleration = -Math.sign(state.speedMps) *
      Math.min(config.rollingDragMps2, Math.abs(state.speedMps) / Math.max(deltaSeconds, 0.001));
  }

  let speed = state.speedMps + acceleration * deltaSeconds;
  if (state.speedMps > 0 && speed < 0 && brake > 0) speed = 0;
  if (state.speedMps < 0 && speed > 0 && brake > 0) speed = 0;
  speed = clamp(speed, -config.maximumReverseSpeedMps, config.maximumForwardSpeedMps);

  const steeringAngle = input.steering * config.maximumSteeringAngleRadians;
  const averageSpeed = (state.speedMps + speed) * 0.5;
  const yawRate = averageSpeed / config.wheelbaseM * Math.tan(steeringAngle);
  const headingRadians = state.headingRadians + yawRate * deltaSeconds;
  const travelHeading = state.headingRadians + (headingRadians - state.headingRadians) * 0.5;

  return {
    x: state.x + Math.sin(travelHeading) * averageSpeed * deltaSeconds,
    z: state.z + Math.cos(travelHeading) * averageSpeed * deltaSeconds,
    headingRadians,
    speedMps: speed
  };
}
