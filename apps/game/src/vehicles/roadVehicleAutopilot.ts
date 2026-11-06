import type { RoadVehicleDynamicsState } from "../vehicles/roadVehicleDynamics";

export type RoadRoutePoint = Readonly<{ x: number; z: number }>;

export type RoadVehicleAutopilotConfig = Readonly<{
  wheelbaseM: number;
  maximumSteeringAngleRadians: number;
  targetSpeedMps: number;
  baseLookaheadM: number;
  speedLookaheadFactor: number;
  throttleGain: number;
  brakeGain: number;
}>;

export type RoadVehicleAutopilotControl = Readonly<{
  throttle: number;
  brake: number;
  steering: number;
  targetPoint: RoadRoutePoint;
  crossTrackErrorM: number;
  routeDistanceM: number;
}>;

type Projection = Readonly<{
  point: RoadRoutePoint;
  segmentIndex: number;
  segmentT: number;
  routeDistanceM: number;
  crossTrackErrorM: number;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function segmentLength(a: RoadRoutePoint, b: RoadRoutePoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function projectToRoute(
  position: RoadRoutePoint,
  route: readonly RoadRoutePoint[]
): Projection {
  let best: Projection | null = null;
  let distanceBeforeSegment = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const a = route[index];
    const b = route[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared <= 1e-8) continue;
    const t = clamp(((position.x - a.x) * dx + (position.z - a.z) * dz) / lengthSquared, 0, 1);
    const point = { x: a.x + t * dx, z: a.z + t * dz };
    const error = Math.hypot(position.x - point.x, position.z - point.z);
    const length = Math.sqrt(lengthSquared);
    if (!best || error < best.crossTrackErrorM) {
      best = {
        point,
        segmentIndex: index,
        segmentT: t,
        routeDistanceM: distanceBeforeSegment + t * length,
        crossTrackErrorM: error
      };
    }
    distanceBeforeSegment += length;
  }
  if (!best) throw new Error("Autopilot route has no non-zero segments.");
  return best;
}

function pointAtRouteDistance(
  route: readonly RoadRoutePoint[],
  startSegmentIndex: number,
  startT: number,
  startDistanceM: number,
  targetDistanceM: number
): RoadRoutePoint {
  let remaining = Math.max(0, targetDistanceM - startDistanceM);
  for (let index = startSegmentIndex; index < route.length - 1; index += 1) {
    const a = route[index];
    const b = route[index + 1];
    const length = segmentLength(a, b);
    if (length <= 1e-6) continue;
    const available = index === startSegmentIndex ? length * (1 - startT) : length;
    if (remaining <= available) {
      const t = index === startSegmentIndex
        ? startT + remaining / length
        : remaining / length;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    remaining -= available;
  }
  return route[route.length - 1];
}

export function isRoadVehicleAutopilotConfigValid(config: RoadVehicleAutopilotConfig): boolean {
  return [
    config.wheelbaseM,
    config.maximumSteeringAngleRadians,
    config.targetSpeedMps,
    config.baseLookaheadM,
    config.speedLookaheadFactor,
    config.throttleGain,
    config.brakeGain
  ].every(Number.isFinite) &&
    config.wheelbaseM > 0 &&
    config.maximumSteeringAngleRadians > 0 &&
    config.maximumSteeringAngleRadians < Math.PI / 2 &&
    config.targetSpeedMps >= 0 &&
    config.baseLookaheadM >= 1 &&
    config.speedLookaheadFactor >= 0 &&
    config.throttleGain > 0 &&
    config.brakeGain > 0;
}

/**
 * Pure-pursuit route follower for future NPC traffic and scripted vehicles.
 * It returns controls but does not advance vehicle physics, enforce traffic
 * rules, choose legal turns or provide authoritative multiplayer behaviour.
 */
export function getRoadVehicleAutopilotControl(
  config: RoadVehicleAutopilotConfig,
  state: RoadVehicleDynamicsState,
  route: readonly RoadRoutePoint[]
): RoadVehicleAutopilotControl {
  if (!isRoadVehicleAutopilotConfigValid(config) ||
      ![state.x, state.z, state.headingRadians, state.speedMps].every(Number.isFinite) ||
      state.speedMps < 0 ||
      route.length < 2 ||
      route.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.z)) ||
      route.slice(1).some((point, index) => segmentLength(route[index], point) <= 1e-6)) {
    throw new Error("Invalid road vehicle autopilot input.");
  }

  const projection = projectToRoute({ x: state.x, z: state.z }, route);
  const lookaheadM = config.baseLookaheadM + state.speedMps * config.speedLookaheadFactor;
  const targetPoint = pointAtRouteDistance(
    route,
    projection.segmentIndex,
    projection.segmentT,
    projection.routeDistanceM,
    projection.routeDistanceM + lookaheadM
  );
  const targetHeading = Math.atan2(targetPoint.x - state.x, targetPoint.z - state.z);
  const headingError = Math.atan2(
    Math.sin(targetHeading - state.headingRadians),
    Math.cos(targetHeading - state.headingRadians)
  );
  const curvature = 2 * Math.sin(headingError) / Math.max(lookaheadM, 1);
  const steeringAngle = Math.atan(config.wheelbaseM * curvature);
  const steering = clamp(steeringAngle / config.maximumSteeringAngleRadians, -1, 1);
  const speedError = config.targetSpeedMps - state.speedMps;
  const throttle = clamp(speedError * config.throttleGain, 0, 1);
  const brake = clamp(-speedError * config.brakeGain, 0, 1);

  return {
    throttle,
    brake,
    steering,
    targetPoint,
    crossTrackErrorM: projection.crossTrackErrorM,
    routeDistanceM: projection.routeDistanceM
  };
}
