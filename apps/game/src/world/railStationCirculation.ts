import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";

export type StationZoneKind =
  | "forecourt"
  | "entrance"
  | "ticketing"
  | "concourse"
  | "vertical_circulation"
  | "platform_waiting"
  | "boarding"
  | "interchange"
  | "lounge"
  | "staff_only"
  | "general_passenger";

export type StationAccessControl = "public" | "ticketed" | "staff_only";

export type StationCirculationZone = Readonly<{
  id: string;
  stationId: string;
  label: string;
  kind: StationZoneKind;
  access: StationAccessControl;
}>;

export type StationCirculationLink = Readonly<{
  id: string;
  stationId: string;
  fromZoneId: string;
  toZoneId: string;
  stepFree: boolean;
  weatherProtected: boolean;
  access: StationAccessControl;
  status: "planned";
  designNote: string;
}>;

export type StationEmergencyEgress = Readonly<{
  id: string;
  stationId: string;
  fromZoneId: string;
  safeAreaZoneId: string;
  stepFree: boolean;
  status: "planned";
}>;

function zoneKind(label: string): StationZoneKind {
  const value = label.toLowerCase();
  if (value.includes("forecourt")) return "forecourt";
  if (value.includes("entrance") || value.includes("security transition")) return "entrance";
  if (value.includes("ticket")) return "ticketing";
  if (value.includes("concourse")) return "concourse";
  if (value.includes("vertical") || value.includes("accessible route")) return "vertical_circulation";
  if (value.includes("platform waiting")) return "platform_waiting";
  if (value.includes("boarding")) return "boarding";
  if (value.includes("interchange")) return "interchange";
  if (value.includes("lounge")) return "lounge";
  if (value.includes("staff") || value.includes("operations")) return "staff_only";
  return "general_passenger";
}

function zoneId(stationId: string, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${stationId}:${slug}`;
}

const zoneEntries = GREATER_ACCRA_RAIL_STATIONS.map((station) => {
  const zones = station.passengerZones.map((label) => ({
    id: zoneId(station.id, label),
    stationId: station.id,
    label,
    kind: zoneKind(label),
    access: zoneKind(label) === "staff_only" ? "staff_only" as const : "public" as const
  }));
  return { station, zones };
});

export const GREATER_ACCRA_STATION_CIRCULATION_ZONES: readonly StationCirculationZone[] =
  zoneEntries.flatMap((entry) => entry.zones);

export const GREATER_ACCRA_STATION_CIRCULATION_LINKS: readonly StationCirculationLink[] =
  zoneEntries.flatMap(({ station, zones }) => {
    const publicZones = zones.filter((zone) => zone.access === "public");
    return publicZones.slice(0, -1).map((zone, index) => {
      const next = publicZones[index + 1];
      const isPlatformAccess = next.kind === "platform_waiting" || next.kind === "boarding";
      return {
        id: `${station.id}:link:${index}`,
        stationId: station.id,
        fromZoneId: zone.id,
        toZoneId: next.id,
        stepFree: true,
        weatherProtected: isPlatformAccess || zone.kind === "forecourt",
        access: next.kind === "boarding" || next.kind === "platform_waiting" ? "ticketed" as const : "public" as const,
        status: "planned" as const,
        designNote: "Provide a continuous, clearly signed accessible route with adequate passenger capacity; final widths, gradients, lifts, stairs and door positions require the approved station plan."
      };
    });
  });

export const GREATER_ACCRA_STATION_EMERGENCY_EGRESS: readonly StationEmergencyEgress[] =
  zoneEntries.flatMap(({ station, zones }) => {
    const safeArea = zones.find((zone) => zone.kind === "forecourt") ?? zones[0];
    if (!safeArea) return [];
    return zones
      .filter((zone) => zone.access === "public" && zone.id !== safeArea.id)
      .map((zone) => ({
        id: `${station.id}:egress:${zone.id}`,
        stationId: station.id,
        fromZoneId: zone.id,
        safeAreaZoneId: safeArea.id,
        stepFree: true,
        status: "planned" as const
      }));
  });

export function getStationCirculation(stationId: string): Readonly<{
  zones: readonly StationCirculationZone[];
  links: readonly StationCirculationLink[];
  emergencyEgress: readonly StationEmergencyEgress[];
}> {
  return {
    zones: GREATER_ACCRA_STATION_CIRCULATION_ZONES.filter((zone) => zone.stationId === stationId),
    links: GREATER_ACCRA_STATION_CIRCULATION_LINKS.filter((link) => link.stationId === stationId),
    emergencyEgress: GREATER_ACCRA_STATION_EMERGENCY_EGRESS.filter((route) => route.stationId === stationId)
  };
}

/**
 * Validates station passenger-zone references and the planned step-free path.
 * This is a design-data check, not a building/fire-code or evacuation analysis.
 */
export function isGreaterAccraStationCirculationValid(): boolean {
  const zoneIds = new Set(GREATER_ACCRA_STATION_CIRCULATION_ZONES.map((zone) => zone.id));
  const linkIds = new Set(GREATER_ACCRA_STATION_CIRCULATION_LINKS.map((link) => link.id));
  const egressIds = new Set(GREATER_ACCRA_STATION_EMERGENCY_EGRESS.map((route) => route.id));
  if (zoneIds.size !== GREATER_ACCRA_STATION_CIRCULATION_ZONES.length ||
      linkIds.size !== GREATER_ACCRA_STATION_CIRCULATION_LINKS.length ||
      egressIds.size !== GREATER_ACCRA_STATION_EMERGENCY_EGRESS.length) return false;

  const zonesValid = GREATER_ACCRA_STATION_CIRCULATION_ZONES.every((zone) =>
    GREATER_ACCRA_RAIL_STATIONS.some((station) => station.id === zone.stationId) &&
    zone.id === zoneId(zone.stationId, zone.label) &&
    zone.label.trim().length > 0
  );
  const linksValid = GREATER_ACCRA_STATION_CIRCULATION_LINKS.every((link) =>
    zoneIds.has(link.fromZoneId) &&
    zoneIds.has(link.toZoneId) &&
    link.fromZoneId !== link.toZoneId &&
    link.stepFree &&
    link.status === "planned"
  );
  const egressValid = GREATER_ACCRA_STATION_EMERGENCY_EGRESS.every((route) =>
    zoneIds.has(route.fromZoneId) &&
    zoneIds.has(route.safeAreaZoneId) &&
    route.fromZoneId !== route.safeAreaZoneId &&
    route.stepFree &&
    route.status === "planned"
  );
  if (!zonesValid || !linksValid || !egressValid) return false;

  return GREATER_ACCRA_RAIL_STATIONS.every((station) => {
    const zones = GREATER_ACCRA_STATION_CIRCULATION_ZONES.filter((zone) => zone.stationId === station.id);
    const publicZones = zones.filter((zone) => zone.access === "public");
    const links = GREATER_ACCRA_STATION_CIRCULATION_LINKS.filter((link) => link.stationId === station.id);
    const egress = GREATER_ACCRA_STATION_EMERGENCY_EGRESS.filter((route) => route.stationId === station.id);
    return publicZones.length >= 2 &&
      links.length === publicZones.length - 1 &&
      egress.length === publicZones.length - 1 &&
      publicZones.every((zone, index) =>
        index === publicZones.length - 1 ||
        links.some((link) => link.fromZoneId === zone.id && link.toZoneId === publicZones[index + 1].id)
      );
  });
}
