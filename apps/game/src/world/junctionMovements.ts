import { GREATER_ACCRA_JUNCTION_APPROACHES } from "./junctionApproaches";
import { GREATER_ACCRA_JUNCTIONS } from "./junctions";

export type JunctionMovementKind = "through" | "turn_left" | "turn_right" | "u_turn";

export type JunctionMovement = Readonly<{
  id: string;
  junctionId: string;
  /** Road the vehicle arrives on. */
  incomingRoadSegmentId: string;
  /** Road the vehicle leaves on. */
  outgoingRoadSegmentId: string;
  kind: JunctionMovementKind;
  /** Signed angle from the incoming travel direction, in degrees. */
  turnAngleDegrees: number;
  /** Movement is a design candidate, not yet an approved drivable connection. */
  status: "planned";
}>;

function classifyMovement(angleDegrees: number): JunctionMovementKind {
  const magnitude = Math.abs(angleDegrees);
  if (magnitude <= 30) return "through";
  if (magnitude >= 150) return "u_turn";
  return angleDegrees > 0 ? "turn_left" : "turn_right";
}

/**
 * Generates candidate movements between every distinct pair of approaches.
 * The catalogue describes possible connectivity only; it does not authorize
 * traffic signals, lane changes, ramp geometry or actual vehicle movement.
 */
export const GREATER_ACCRA_JUNCTION_MOVEMENTS: readonly JunctionMovement[] =
  GREATER_ACCRA_JUNCTIONS.flatMap((junction) => {
    const approaches = GREATER_ACCRA_JUNCTION_APPROACHES.filter(
      (approach) => approach.junctionId === junction.id
    );
    return approaches.flatMap((incoming) =>
      approaches
        .filter((outgoing) => outgoing.roadSegmentId !== incoming.roadSegmentId)
        .map((outgoing) => {
          // An arriving vehicle travels opposite to the incoming arm's outward vector.
          const inX = -incoming.outwardDirection.x;
          const inZ = -incoming.outwardDirection.z;
          const outX = outgoing.outwardDirection.x;
          const outZ = outgoing.outwardDirection.z;
          const angle = Math.atan2(inX * outZ - inZ * outX, inX * outX + inZ * outZ) * 180 / Math.PI;
          const roundedAngle = Math.round(angle * 100) / 100;
          return {
            id: `${junction.id}--${incoming.roadSegmentId}--to--${outgoing.roadSegmentId}`,
            junctionId: junction.id,
            incomingRoadSegmentId: incoming.roadSegmentId,
            outgoingRoadSegmentId: outgoing.roadSegmentId,
            kind: classifyMovement(roundedAngle),
            turnAngleDegrees: roundedAngle,
            status: "planned" as const
          };
        })
    );
  });

export function getJunctionMovements(junctionId: string): readonly JunctionMovement[] {
  return GREATER_ACCRA_JUNCTION_MOVEMENTS.filter((movement) => movement.junctionId === junctionId);
}

export function isGreaterAccraJunctionMovementCatalogueValid(): boolean {
  const ids = new Set(GREATER_ACCRA_JUNCTION_MOVEMENTS.map((movement) => movement.id));
  const expectedCount = GREATER_ACCRA_JUNCTIONS.reduce((total, junction) => {
    const approachCount = GREATER_ACCRA_JUNCTION_APPROACHES.filter(
      (approach) => approach.junctionId === junction.id
    ).length;
    return total + approachCount * Math.max(0, approachCount - 1);
  }, 0);

  return ids.size === GREATER_ACCRA_JUNCTION_MOVEMENTS.length &&
    GREATER_ACCRA_JUNCTION_MOVEMENTS.length === expectedCount &&
    GREATER_ACCRA_JUNCTION_MOVEMENTS.every((movement) => {
      const incoming = GREATER_ACCRA_JUNCTION_APPROACHES.find(
        (approach) => approach.junctionId === movement.junctionId &&
          approach.roadSegmentId === movement.incomingRoadSegmentId
      );
      const outgoing = GREATER_ACCRA_JUNCTION_APPROACHES.find(
        (approach) => approach.junctionId === movement.junctionId &&
          approach.roadSegmentId === movement.outgoingRoadSegmentId
      );
      const angle = movement.turnAngleDegrees;
      return !!incoming && !!outgoing &&
        incoming.roadSegmentId !== outgoing.roadSegmentId &&
        Number.isFinite(angle) && angle >= -180 && angle <= 180 &&
        movement.kind === classifyMovement(angle) &&
        movement.status === "planned";
    });
}
