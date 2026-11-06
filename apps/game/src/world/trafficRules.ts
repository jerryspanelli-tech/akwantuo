/**
 * Baseline Greater Accra road-traffic conventions for the game simulation.
 * These are gameplay rules, not a complete statement of Ghanaian traffic law.
 * Posted limits, local restrictions and junction-specific controls must be
 * configured from reviewed map data rather than guessed from road class.
 */
export type TrafficSide = "left" | "right";
export type RoundaboutCirculation = "clockwise" | "counterclockwise";

export type RoadTrafficRules = Readonly<{
  id: string;
  regionId: string;
  driveSide: TrafficSide;
  overtakeSide: TrafficSide;
  roundaboutCirculation: RoundaboutCirculation;
  giveWayToTrafficOnRoundabout: boolean;
  keepJunctionClear: boolean;
  stopAtRedSignal: boolean;
  respectMarkedPedestrianCrossings: boolean;
  yieldToEmergencyVehicles: boolean;
  publicTransportStopsMustBeDesignated: boolean;
  motorwayStoppingForbiddenExceptEmergency: boolean;
  speedLimitSource: "posted_sign_or_explicit_area_rule";
  status: "planned";
  designNote: string;
}>;

export const GREATER_ACCRA_TRAFFIC_RULES: RoadTrafficRules = {
  id: "greater-accra-road-traffic-baseline",
  regionId: "greater-accra",
  driveSide: "right",
  overtakeSide: "left",
  roundaboutCirculation: "counterclockwise",
  giveWayToTrafficOnRoundabout: true,
  keepJunctionClear: true,
  stopAtRedSignal: true,
  respectMarkedPedestrianCrossings: true,
  yieldToEmergencyVehicles: true,
  publicTransportStopsMustBeDesignated: true,
  motorwayStoppingForbiddenExceptEmergency: true,
  speedLimitSource: "posted_sign_or_explicit_area_rule",
  status: "planned",
  designNote: "Right-hand traffic is the Greater Accra gameplay baseline. Junction priority, signal timing, speed limits and local restrictions must be supplied by reviewed road-control data; road class alone never invents a posted speed."
};

export function isRoadTrafficRulesValid(value: unknown): value is RoadTrafficRules {
  if (!value || typeof value !== "object") return false;
  const rules = value as Partial<RoadTrafficRules>;
  return typeof rules.id === "string" && rules.id.trim().length > 0 &&
    typeof rules.regionId === "string" && rules.regionId.trim().length > 0 &&
    ["left", "right"].includes(String(rules.driveSide)) &&
    ["left", "right"].includes(String(rules.overtakeSide)) &&
    rules.driveSide !== rules.overtakeSide &&
    ["clockwise", "counterclockwise"].includes(String(rules.roundaboutCirculation)) &&
    typeof rules.giveWayToTrafficOnRoundabout === "boolean" &&
    typeof rules.keepJunctionClear === "boolean" &&
    typeof rules.stopAtRedSignal === "boolean" &&
    typeof rules.respectMarkedPedestrianCrossings === "boolean" &&
    typeof rules.yieldToEmergencyVehicles === "boolean" &&
    typeof rules.publicTransportStopsMustBeDesignated === "boolean" &&
    typeof rules.motorwayStoppingForbiddenExceptEmergency === "boolean" &&
    rules.speedLimitSource === "posted_sign_or_explicit_area_rule" &&
    rules.status === "planned" &&
    typeof rules.designNote === "string" && rules.designNote.trim().length > 0;
}

export function isGreaterAccraTrafficRulesValid(): boolean {
  return GREATER_ACCRA_TRAFFIC_RULES.regionId === "greater-accra" &&
    GREATER_ACCRA_TRAFFIC_RULES.driveSide === "right" &&
    GREATER_ACCRA_TRAFFIC_RULES.roundaboutCirculation === "counterclockwise" &&
    isRoadTrafficRulesValid(GREATER_ACCRA_TRAFFIC_RULES);
}
