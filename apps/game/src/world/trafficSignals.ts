export type TrafficSignalPhase = "red" | "amber" | "green";

export type TrafficSignalPlan = Readonly<{
  id: string;
  greenSeconds: number;
  amberSeconds: number;
  redSeconds: number;
  offsetSeconds: number;
  status: "planned";
}>;

export type TrafficSignalState = Readonly<{
  phase: TrafficSignalPhase;
  elapsedInPhaseSeconds: number;
  remainingInPhaseSeconds: number;
  cyclePositionSeconds: number;
}>;

export function isTrafficSignalPlanValid(value: unknown): value is TrafficSignalPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<TrafficSignalPlan>;
  return typeof plan.id === "string" && plan.id.trim().length > 0 &&
    Number.isFinite(plan.greenSeconds) && (plan.greenSeconds ?? 0) > 0 &&
    Number.isFinite(plan.amberSeconds) && (plan.amberSeconds ?? 0) > 0 &&
    Number.isFinite(plan.redSeconds) && (plan.redSeconds ?? 0) > 0 &&
    Number.isFinite(plan.offsetSeconds) && plan.offsetSeconds !== undefined &&
    plan.status === "planned";
}

/**
 * Deterministic single-approach signal cycle for local simulation.
 * A real junction must supply reviewed phase plans and conflict groups;
 * this helper does not infer right-of-way or replace traffic engineering.
 */
export function getTrafficSignalState(
  plan: TrafficSignalPlan,
  simulationTimeSeconds: number
): TrafficSignalState {
  if (!isTrafficSignalPlanValid(plan) || !Number.isFinite(simulationTimeSeconds)) {
    throw new Error("Invalid traffic signal plan or simulation time.");
  }
  const cycleSeconds = plan.greenSeconds + plan.amberSeconds + plan.redSeconds;
  const rawPosition = (simulationTimeSeconds + plan.offsetSeconds) % cycleSeconds;
  const cyclePositionSeconds = (rawPosition + cycleSeconds) % cycleSeconds;

  if (cyclePositionSeconds < plan.greenSeconds) {
    return {
      phase: "green",
      elapsedInPhaseSeconds: cyclePositionSeconds,
      remainingInPhaseSeconds: plan.greenSeconds - cyclePositionSeconds,
      cyclePositionSeconds
    };
  }
  if (cyclePositionSeconds < plan.greenSeconds + plan.amberSeconds) {
    const elapsed = cyclePositionSeconds - plan.greenSeconds;
    return {
      phase: "amber",
      elapsedInPhaseSeconds: elapsed,
      remainingInPhaseSeconds: plan.amberSeconds - elapsed,
      cyclePositionSeconds
    };
  }
  const elapsed = cyclePositionSeconds - plan.greenSeconds - plan.amberSeconds;
  return {
    phase: "red",
    elapsedInPhaseSeconds: elapsed,
    remainingInPhaseSeconds: plan.redSeconds - elapsed,
    cyclePositionSeconds
  };
}

export function mayProceedOnTrafficSignal(
  phase: TrafficSignalPhase,
  movementIsProtected: boolean
): boolean {
  return phase === "green" && movementIsProtected;
}
