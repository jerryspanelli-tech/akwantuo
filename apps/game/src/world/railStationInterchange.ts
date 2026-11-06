import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";

export type StationInterchangeMode =
  | "trotro"
  | "city_bus"
  | "taxi"
  | "ride_hailing"
  | "private_dropoff"
  | "pedestrian"
  | "bicycle";

export type StationInterchangeOperation = "boarding" | "alighting" | "both";

export type StationInterchangeService = Readonly<{
  id: string;
  stationId: string;
  mode: StationInterchangeMode;
  name: string;
  operation: StationInterchangeOperation;
  accessPrinciples: readonly string[];
  status: "planned";
  designNote: string;
}>;

const COMMON_ACCESS_PRINCIPLES = [
  "Keep passenger walking routes physically separated from moving vehicles",
  "Provide weather-protected waiting and clear route information",
  "Keep emergency and service access unobstructed",
  "Provide step-free pedestrian access between forecourt and station entrance",
  "Use clear signs and visible kerbside markings"
] as const;

/**
 * Functional interchange brief only. It does not assign bay counts, exact
 * forecourt positions, operating capacity or road access geometry.
 */
export const GREATER_ACCRA_STATION_INTERCHANGES: readonly StationInterchangeService[] =
  GREATER_ACCRA_RAIL_STATIONS.filter((station) => station.status === "planned").flatMap((station) => {
    const modes: readonly StationInterchangeMode[] = [
      "trotro", "city_bus", "taxi", "ride_hailing", "private_dropoff", "pedestrian", "bicycle"
    ];
    return modes.map((mode) => ({
      id: `${station.id}-${mode}`,
      stationId: station.id,
      mode,
      name: ({
        trotro: "Trotro interchange",
        city_bus: "City bus interchange",
        taxi: "Taxi rank",
        ride_hailing: "Ride-hailing pickup",
        private_dropoff: "Private vehicle drop-off",
        pedestrian: "Pedestrian access",
        bicycle: "Bicycle access and parking"
      } as const)[mode],
      operation: "both" as StationInterchangeOperation,
      accessPrinciples: COMMON_ACCESS_PRINCIPLES,
      status: "planned" as const,
      designNote: `Provide a legible ${mode.replaceAll("_", " ")} connection without allowing queues to block the station entrance or through traffic. Exact capacity and placement require a station-specific site plan.`
    }));
  });

export function getStationInterchangeServices(stationId: string): readonly StationInterchangeService[] {
  return GREATER_ACCRA_STATION_INTERCHANGES.filter((service) => service.stationId === stationId);
}

export function isGreaterAccraStationInterchangeCatalogueValid(): boolean {
  const stationIds = new Set(GREATER_ACCRA_RAIL_STATIONS.filter((station) => station.status === "planned").map((station) => station.id));
  const ids = GREATER_ACCRA_STATION_INTERCHANGES.map((service) => service.id);
  return new Set(ids).size === ids.length &&
    GREATER_ACCRA_STATION_INTERCHANGES.length === stationIds.size * 7 &&
    GREATER_ACCRA_STATION_INTERCHANGES.every((service) =>
      stationIds.has(service.stationId) &&
      ["trotro", "city_bus", "taxi", "ride_hailing", "private_dropoff", "pedestrian", "bicycle"].includes(service.mode) &&
      ["boarding", "alighting", "both"].includes(service.operation) &&
      service.accessPrinciples.length >= 4 &&
      service.status === "planned" &&
      service.designNote.trim().length > 0
    );
}
