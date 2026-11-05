import {
  isValidPublicTransportRoute,
  isValidPublicTransportStop,
  isValidPublicTransportVehicleProfile,
  type PublicTransportRoute,
  type PublicTransportStop,
  type PublicTransportVehicleProfile,
  type PassengerRideExperience
} from "@akwantuo/shared";

/**
 * Passenger-facing transport foundations.
 * Interior window views must render the moving world outside the vehicle,
 * not a static background or a camera fixed to the vehicle exterior.
 */
const GHANAIAN_PASSENGER_RIDE: PassengerRideExperience = {
  availableCameraModes: ["interior_window", "interior_free_look", "exterior_follow"],
  defaultCameraMode: "interior_window",
  allowLookAround: true,
  showWorldThroughWindows: true,
  status: "planned"
};

export const PUBLIC_TRANSPORT_VEHICLE_PROFILES: readonly PublicTransportVehicleProfile[] = [
  {
    id: "shared-trotro",
    name: "Shared trotro minibus",
    kind: "trotro",
    passengerRide: GHANAIAN_PASSENGER_RIDE,
    hasDriver: true,
    hasConductor: true,
    status: "planned",
    designNote: "Ghana-inspired shared minibus with passenger seats, sliding side access where appropriate, route destination display and a mate/conductor role. Passengers can look through the windows while the vehicle moves."
  },
  {
    id: "city-public-bus",
    name: "City public bus",
    kind: "city_bus",
    passengerRide: GHANAIAN_PASSENGER_RIDE,
    hasDriver: true,
    hasConductor: false,
    status: "planned",
    designNote: "Passenger bus with seated interior view, visible windows, stop announcements and designated boarding points."
  },
  {
    id: "intercity-coach",
    name: "Intercity coach",
    kind: "coach",
    passengerRide: GHANAIAN_PASSENGER_RIDE,
    hasDriver: true,
    hasConductor: false,
    status: "planned",
    designNote: "Long-distance passenger coach with forward-facing seats, broad window views and luggage storage; intended for later intercity travel."
  },
  {
    id: "ghanaian-shared-taxi",
    name: "Shared or private taxi",
    kind: "taxi",
    passengerRide: GHANAIAN_PASSENGER_RIDE,
    hasDriver: true,
    hasConductor: false,
    status: "planned",
    designNote: "Passenger can ride in the front or rear seat and look through side and windscreen windows while travelling."
  }
] as const;

/** Real stop placements and route sequences wait for the approved map layout. */
export const GREATER_ACCRA_PUBLIC_TRANSPORT_STOPS: readonly PublicTransportStop[] = [];
export const GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTES: readonly PublicTransportRoute[] = [];

export function isPublicTransportCatalogueValid(): boolean {
  const vehicleIds = PUBLIC_TRANSPORT_VEHICLE_PROFILES.map((vehicle) => vehicle.id);
  const stopIds = GREATER_ACCRA_PUBLIC_TRANSPORT_STOPS.map((stop) => stop.id);
  const routeIds = GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTES.map((route) => route.id);
  return PUBLIC_TRANSPORT_VEHICLE_PROFILES.every(isValidPublicTransportVehicleProfile) &&
    new Set(vehicleIds).size === vehicleIds.length &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_STOPS.every(isValidPublicTransportStop) &&
    new Set(stopIds).size === stopIds.length &&
    GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTES.every((route) =>
      isValidPublicTransportRoute(route, PUBLIC_TRANSPORT_VEHICLE_PROFILES, GREATER_ACCRA_PUBLIC_TRANSPORT_STOPS)
    ) &&
    new Set(routeIds).size === routeIds.length;
}
