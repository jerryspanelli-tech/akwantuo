export type RailPathPoint = Readonly<{ x: number; z: number }>;

export type RailStationStop = Readonly<{
  id: string;
  distanceM: number;
  dwellSeconds: number;
}>;

export type RailTrainOperationConfig = Readonly<{
  path: readonly RailPathPoint[];
  stops: readonly RailStationStop[];
  maximumSpeedMps: number;
  accelerationMps2: number;
  serviceBrakingMps2: number;
}>;

export type RailTrainOperationState = Readonly<{
  distanceM: number;
  speedMps: number;
  nextStopIndex: number;
  dwellRemainingSeconds: number;
  currentStopId: string | null;
  completed: boolean;
}>;

export type RailTrainOperationFrame = Readonly<{
  state: RailTrainOperationState;
  position: RailPathPoint;
  headingRadians: number;
  totalDistanceM: number;
}>;

type MeasuredPath = Readonly<{
  points: readonly RailPathPoint[];
  cumulative: readonly number[];
  totalDistanceM: number;
}>;

function measurePath(path: readonly RailPathPoint[]): MeasuredPath {
  const cumulative = [0];
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    cumulative.push(cumulative[index - 1] + Math.hypot(
      current.x - previous.x,
      current.z - previous.z
    ));
  }
  return { points: path, cumulative, totalDistanceM: cumulative[cumulative.length - 1] };
}

export function isRailTrainOperationConfigValid(config: RailTrainOperationConfig): boolean {
  if (config.path.length < 2 ||
      ![config.maximumSpeedMps, config.accelerationMps2, config.serviceBrakingMps2]
        .every((value) => Number.isFinite(value) && value > 0) ||
      !config.path.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z))) {
    return false;
  }

  const measured = measurePath(config.path);
  if (!(measured.totalDistanceM > 0)) return false;
  const ids = new Set<string>();
  let previousDistance = -1;
  return config.stops.every((stop) => {
    const valid = stop.id.trim().length > 0 &&
      !ids.has(stop.id) &&
      Number.isFinite(stop.distanceM) &&
      stop.distanceM > previousDistance &&
      stop.distanceM > 0 &&
      stop.distanceM <= measured.totalDistanceM &&
      Number.isFinite(stop.dwellSeconds) &&
      stop.dwellSeconds >= 0;
    ids.add(stop.id);
    previousDistance = stop.distanceM;
    return valid;
  });
}

export function isRailTrainOperationStateValid(
  config: RailTrainOperationConfig,
  state: RailTrainOperationState
): boolean {
  if (!isRailTrainOperationConfigValid(config) ||
      !Number.isFinite(state.distanceM) ||
      !Number.isFinite(state.speedMps) ||
      !Number.isInteger(state.nextStopIndex) ||
      !Number.isFinite(state.dwellRemainingSeconds) ||
      typeof state.completed !== "boolean" ||
      !(state.currentStopId === null || typeof state.currentStopId === "string")) {
    return false;
  }

  const totalDistanceM = measurePath(config.path).totalDistanceM;
  if (state.distanceM < 0 || state.distanceM > totalDistanceM ||
      state.speedMps < 0 || state.speedMps > config.maximumSpeedMps ||
      state.nextStopIndex < 0 || state.nextStopIndex > config.stops.length ||
      state.dwellRemainingSeconds < 0) {
    return false;
  }

  if (state.currentStopId !== null) {
    if (state.dwellRemainingSeconds <= 0 || state.nextStopIndex < 1) return false;
    const activeStop = config.stops[state.nextStopIndex - 1];
    if (!activeStop || activeStop.id !== state.currentStopId ||
        state.distanceM !== activeStop.distanceM ||
        state.dwellRemainingSeconds > activeStop.dwellSeconds) return false;
  } else if (state.dwellRemainingSeconds > 0) {
    return false;
  }

  if (state.completed) {
    return state.distanceM === totalDistanceM &&
      state.speedMps === 0 &&
      state.nextStopIndex === config.stops.length &&
      state.dwellRemainingSeconds === 0 &&
      state.currentStopId === null;
  }

  const nextStop = config.stops[state.nextStopIndex];
  return !nextStop || state.distanceM <= nextStop.distanceM;
}

export function createRailTrainOperationState(): RailTrainOperationState {
  return {
    distanceM: 0,
    speedMps: 0,
    nextStopIndex: 0,
    dwellRemainingSeconds: 0,
    currentStopId: null,
    completed: false
  };
}

function samplePath(path: MeasuredPath, distanceM: number): {
  position: RailPathPoint;
  headingRadians: number;
} {
  const distance = Math.max(0, Math.min(path.totalDistanceM, distanceM));
  let segment = 0;
  while (segment < path.cumulative.length - 2 &&
         path.cumulative[segment + 1] < distance) segment += 1;

  const start = path.points[segment];
  const end = path.points[segment + 1];
  const segmentLength = path.cumulative[segment + 1] - path.cumulative[segment];
  const amount = segmentLength > 0
    ? (distance - path.cumulative[segment]) / segmentLength
    : 0;
  return {
    position: {
      x: start.x + (end.x - start.x) * amount,
      z: start.z + (end.z - start.z) * amount
    },
    headingRadians: Math.atan2(end.x - start.x, end.z - start.z)
  };
}

/**
 * Advances a deterministic rail-service simulation by a bounded time step.
 * This is a client-side simulation helper, not authoritative multiplayer state,
 * railway signalling, a timetable, or a substitute for rail safety systems.
 */
export function advanceRailTrain(
  config: RailTrainOperationConfig,
  state: RailTrainOperationState,
  deltaSeconds: number
): RailTrainOperationFrame {
  if (!isRailTrainOperationConfigValid(config)) {
    throw new Error("Invalid rail train operation configuration.");
  }
  if (!isRailTrainOperationStateValid(config, state)) {
    throw new Error("Invalid rail train operation state.");
  }
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || deltaSeconds > 1) {
    throw new Error("Rail train time step must be between 0 and 1 second.");
  }

  const measured = measurePath(config.path);
  let next: RailTrainOperationState = { ...state };
  if (state.completed || deltaSeconds === 0) {
    const sample = samplePath(measured, state.distanceM);
    return { state, ...sample, totalDistanceM: measured.totalDistanceM };
  }

  if (state.dwellRemainingSeconds > 0) {
    const remaining = Math.max(0, state.dwellRemainingSeconds - deltaSeconds);
    next = {
      ...state,
      dwellRemainingSeconds: remaining,
      currentStopId: remaining > 0 ? state.currentStopId : null
    };
    const sample = samplePath(measured, next.distanceM);
    return { state: next, ...sample, totalDistanceM: measured.totalDistanceM };
  }

  const nextStop = config.stops[state.nextStopIndex];
  const targetDistance = nextStop?.distanceM ?? measured.totalDistanceM;
  const distanceToTarget = Math.max(0, targetDistance - state.distanceM);
  const brakingSpeed = Math.sqrt(2 * config.serviceBrakingMps2 * distanceToTarget);
  const targetSpeed = Math.min(config.maximumSpeedMps, brakingSpeed);
  const accelerating = targetSpeed > state.speedMps;
  const rate = accelerating ? config.accelerationMps2 : config.serviceBrakingMps2;
  const speedDelta = rate * deltaSeconds;
  const speed = accelerating
    ? Math.min(targetSpeed, state.speedMps + speedDelta)
    : Math.max(targetSpeed, state.speedMps - speedDelta);
  const travelled = (state.speedMps + speed) * 0.5 * deltaSeconds;
  const reachedTarget = travelled >= distanceToTarget ||
    distanceToTarget <= 0.001;

  if (reachedTarget) {
    const atStation = !!nextStop && nextStop.distanceM <= measured.totalDistanceM;
    next = {
      distanceM: targetDistance,
      speedMps: 0,
      nextStopIndex: state.nextStopIndex + (atStation ? 1 : 0),
      dwellRemainingSeconds: atStation ? nextStop.dwellSeconds : 0,
      currentStopId: atStation && nextStop.dwellSeconds > 0 ? nextStop.id : null,
      completed: !atStation
    };
  } else {
    next = {
      ...state,
      distanceM: Math.min(targetDistance, state.distanceM + travelled),
      speedMps: speed,
      currentStopId: null
    };
  }

  const sample = samplePath(measured, next.distanceM);
  return { state: next, ...sample, totalDistanceM: measured.totalDistanceM };
}
