export type MotorcycleDynamicsConfig = Readonly<{
  wheelbaseM: number;
  maximumForwardSpeedMps: number;
  maximumReverseSpeedMps: number;
  maximumAccelerationMps2: number;
  serviceBrakingMps2: number;
  maximumSteeringAngleRadians: number;
  maximumLeanAngleRadians: number;
  gravityMps2: number;
  rollingDragMps2: number;
}>;

export type MotorcycleDynamicsState = Readonly<{
  x: number;
  z: number;
  headingRadians: number;
  speedMps: number;
  leanAngleRadians: number;
}>;

export type MotorcycleControlInput = Readonly<{
  throttle: number;
  brake: number;
  steering: number;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approachZero(value: number, amount: number): number {
  if (value > 0) return Math.max(0, value - amount);
  if (value < 0) return Math.min(0, value + amount);
  return 0;
}

export function isMotorcycleDynamicsConfigValid(config: MotorcycleDynamicsConfig): boolean {
  return [
    config.wheelbaseM,
    config.maximumForwardSpeedMps,
    config.maximumReverseSpeedMps,
    config.maximumAccelerationMps2,
    config.serviceBrakingMps2,
    config.maximumSteeringAngleRadians,
    config.maximumLeanAngleRadians,
    config.gravityMps2,
    config.rollingDragMps2
  ].every(Number.isFinite) &&
    config.wheelbaseM >= 0.8 &&
    config.maximumForwardSpeedMps > 0 &&
    config.maximumReverseSpeedMps >= 0 &&
    config.maximumAccelerationMps2 > 0 &&
    config.serviceBrakingMps2 > 0 &&
    config.maximumSteeringAngleRadians > 0 &&
    config.maximumSteeringAngleRadians < Math.PI / 2 &&
    config.maximumLeanAngleRadians > 0 &&
    config.maximumLeanAngleRadians <= Math.PI / 3 &&
    config.gravityMps2 >= 1 &&
    config.rollingDragMps2 >= 0;
}

export function isMotorcycleDynamicsStateValid(
  state: MotorcycleDynamicsState,
  config: MotorcycleDynamicsConfig
): boolean {
  return isMotorcycleDynamicsConfigValid(config) &&
    [state.x, state.z, state.headingRadians, state.speedMps, state.leanAngleRadians].every(Number.isFinite) &&
    state.speedMps >= -config.maximumReverseSpeedMps - 1e-6 &&
    state.speedMps <= config.maximumForwardSpeedMps + 1e-6 &&
    Math.abs(state.leanAngleRadians) <= config.maximumLeanAngleRadians + 1e-6;
}

/**
 * Lightweight motorcycle single-track model. Steering drives yaw through the
 * wheelbase; lateral acceleration produces a bounded lean angle. It is a
 * gameplay model, not tyre-contact, suspension, counter-steering or crash
 * physics, and is not yet connected to a rendered motorcycle asset.
 */
export function advanceMotorcycleDynamics(
  config: MotorcycleDynamicsConfig,
  state: MotorcycleDynamicsState,
  input: MotorcycleControlInput,
  deltaSeconds: number
): MotorcycleDynamicsState {
  if (!isMotorcycleDynamicsConfigValid(config) ||
      !isMotorcycleDynamicsStateValid(state, config) ||
      ![input.throttle, input.brake, input.steering, deltaSeconds].every(Number.isFinite) ||
      input.throttle < -1 || input.throttle > 1 ||
      input.brake < 0 || input.brake > 1 ||
      input.steering < -1 || input.steering > 1 ||
      deltaSeconds < 0 || deltaSeconds > 0.25) {
    throw new Error("Invalid motorcycle dynamics input.");
  }

  let speed = state.speedMps;
  if (input.throttle > 0) {
    speed = Math.min(config.maximumForwardSpeedMps,
      speed + input.throttle * config.maximumAccelerationMps2 * deltaSeconds);
  } else if (input.throttle < 0) {
    speed = Math.max(-config.maximumReverseSpeedMps,
      speed + input.throttle * config.maximumAccelerationMps2 * deltaSeconds);
  }
  speed = approachZero(speed, input.brake * config.serviceBrakingMps2 * deltaSeconds);
  speed = approachZero(speed, config.rollingDragMps2 * deltaSeconds);
  speed = clamp(speed, -config.maximumReverseSpeedMps, config.maximumForwardSpeedMps);

  const steeringAngle = input.steering * config.maximumSteeringAngleRadians;
  const yawRate = speed * Math.tan(steeringAngle) / config.wheelbaseM;
  const headingRadians = state.headingRadians + yawRate * deltaSeconds;
  const lateralAcceleration = speed * yawRate;
  const leanAngleRadians = clamp(
    Math.atan2(lateralAcceleration, config.gravityMps2),
    -config.maximumLeanAngleRadians,
    config.maximumLeanAngleRadians
  );

  return {
    x: state.x + Math.sin(headingRadians) * speed * deltaSeconds,
    z: state.z + Math.cos(headingRadians) * speed * deltaSeconds,
    headingRadians,
    speedMps: speed,
    leanAngleRadians
  };
}
