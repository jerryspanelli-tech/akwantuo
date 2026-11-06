export type RoadVehicleKind =
  | "private_car"
  | "taxi"
  | "trotro"
  | "city_bus"
  | "intercity_coach"
  | "motorcycle"
  | "delivery_van"
  | "rigid_truck"
  | "articulated_truck"
  | "ambulance"
  | "police_vehicle";

export type RoadVehicleProfile = Readonly<{
  id: string;
  name: string;
  kind: RoadVehicleKind;
  passengerCapacity: number;
  hasDriver: boolean;
  hasConductor: boolean;
  trafficRole: "private" | "public_transport" | "commercial" | "emergency";
  firstRelease: boolean;
  designRequirements: readonly string[];
  status: "planned";
  designNote: string;
}>;

const COMMON_VEHICLE_REQUIREMENTS = [
  "Authentic Ghana-appropriate proportions and road presence",
  "Working headlights, brake lights, indicators and reverse lights",
  "Visible wheels with suspension response and grounded tyre contact",
  "Vehicle collision shape must match its visible body",
  "Mobile-friendly level of detail and efficient material reuse",
  "Driver and passenger entry points must align with interior seats"
] as const;

/**
 * Vehicle content plan only. These are not production vehicle models,
 * physics settings, homologation data or licensed manufacturer replicas.
 */
export const GREATER_ACCRA_ROAD_VEHICLES: readonly RoadVehicleProfile[] = [
  {
    id: "private-saloon-car", name: "Private saloon car", kind: "private_car",
    passengerCapacity: 4, hasDriver: true, hasConductor: false, trafficRole: "private",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Common everyday passenger car with a usable cabin, boot, doors and Ghana-appropriate street wear."
  },
  {
    id: "ghana-shared-taxi", name: "Shared or private taxi", kind: "taxi",
    passengerCapacity: 4, hasDriver: true, hasConductor: false, trafficRole: "public_transport",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Taxi variants with clear roof/signage options and configurable shared or private passenger service."
  },
  {
    id: "trotro-minibus", name: "Trotro minibus", kind: "trotro",
    passengerCapacity: 14, hasDriver: true, hasConductor: true, trafficRole: "public_transport",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Shared minibus with sliding passenger access, mate/conductor position and route destination display."
  },
  {
    id: "city-public-bus", name: "City public bus", kind: "city_bus",
    passengerCapacity: 40, hasDriver: true, hasConductor: false, trafficRole: "public_transport",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "High-capacity urban bus with standing and seated passenger zones; capacity is a gameplay target."
  },
  {
    id: "intercity-coach", name: "Intercity coach", kind: "intercity_coach",
    passengerCapacity: 48, hasDriver: true, hasConductor: false, trafficRole: "public_transport",
    firstRelease: false, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Long-distance coach for later intercity expansion; capacity is a gameplay target."
  },
  {
    id: "motorcycle", name: "Motorcycle", kind: "motorcycle",
    passengerCapacity: 1, hasDriver: true, hasConductor: false, trafficRole: "private",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Two-wheel vehicle with lean-aware handling and a distinct rider mounting animation; passenger variants require separate review."
  },
  {
    id: "delivery-van", name: "Delivery van", kind: "delivery_van",
    passengerCapacity: 2, hasDriver: true, hasConductor: false, trafficRole: "commercial",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Commercial light van for courier, shop supply and small-business jobs."
  },
  {
    id: "rigid-truck", name: "Rigid goods truck", kind: "rigid_truck",
    passengerCapacity: 2, hasDriver: true, hasConductor: false, trafficRole: "commercial",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Medium and heavy rigid goods vehicle for deliveries, construction and industrial traffic."
  },
  {
    id: "articulated-truck", name: "Articulated heavy truck", kind: "articulated_truck",
    passengerCapacity: 2, hasDriver: true, hasConductor: false, trafficRole: "commercial",
    firstRelease: false, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Tractor and trailer combination for Tema port and industrial freight corridors; advanced turning and reversing required."
  },
  {
    id: "ambulance", name: "Emergency ambulance", kind: "ambulance",
    passengerCapacity: 2, hasDriver: true, hasConductor: false, trafficRole: "emergency",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Emergency response vehicle with controlled warning lights and medical response gameplay."
  },
  {
    id: "police-patrol-vehicle", name: "Police patrol vehicle", kind: "police_vehicle",
    passengerCapacity: 4, hasDriver: true, hasConductor: false, trafficRole: "emergency",
    firstRelease: true, designRequirements: COMMON_VEHICLE_REQUIREMENTS, status: "planned",
    designNote: "Police patrol vehicle with secure equipment storage, controlled siren and emergency-light behaviour."
  }
] as const;

export function getRoadVehicleProfile(id: string): RoadVehicleProfile | undefined {
  return GREATER_ACCRA_ROAD_VEHICLES.find((vehicle) => vehicle.id === id);
}

export function getFirstReleaseRoadVehicles(): readonly RoadVehicleProfile[] {
  return GREATER_ACCRA_ROAD_VEHICLES.filter((vehicle) => vehicle.firstRelease);
}

export function isRoadVehicleCatalogueValid(): boolean {
  const ids = GREATER_ACCRA_ROAD_VEHICLES.map((vehicle) => vehicle.id);
  return new Set(ids).size === ids.length &&
    GREATER_ACCRA_ROAD_VEHICLES.every((vehicle) =>
      vehicle.id.trim().length > 0 &&
      vehicle.name.trim().length > 0 &&
      vehicle.passengerCapacity >= 1 &&
      Number.isInteger(vehicle.passengerCapacity) &&
      vehicle.hasDriver &&
      ["private", "public_transport", "commercial", "emergency"].includes(vehicle.trafficRole) &&
      vehicle.designRequirements.length >= 5 &&
      vehicle.status === "planned" &&
      vehicle.designNote.trim().length > 0
    );
}
