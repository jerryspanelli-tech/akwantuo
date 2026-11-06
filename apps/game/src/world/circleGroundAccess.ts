/**
 * Ground-level local access routes around Kwame Nkrumah Circle.
 *
 * Sequences are transcribed from public project and transport reports. They
 * preserve street names and connectivity only; they are not local splines,
 * one-way rules, lane paths or surveyed coordinates.
 */

export type CircleGroundAccessRoute = Readonly<{
  id: string;
  name: string;
  purpose: "local_vehicle_access" | "pedestrian_area_access" | "ring_road_connection";
  corridorSequence: readonly string[];
  status: "topology_reference";
  designNote: string;
}>;

export const CIRCLE_GROUND_ACCESS_ROUTES: readonly CircleGroundAccessRoute[] = [
  {
    id: "circle-ground-feo-oye-o-to-nsawam-local-access",
    name: "Feo Oyeo–Dadeban–Otublohum local access route",
    purpose: "local_vehicle_access",
    corridorSequence: [
      "Kwame Nkrumah Circle ground-level roundabout",
      "Feo Oyeo Road",
      "Dadeban Road",
      "Abotia Street",
      "Otublohum Road",
      "Obibini Street",
      "Nsawam Road"
    ],
    status: "topology_reference",
    designNote: "A 2023 World Bank project document describes this route as an alternative from the Circle roundabout to Nsawam Road. Confirm current street names, access restrictions and exact alignment before building it."
  },
  {
    id: "circle-ground-otublohum-to-pedestrian-mall",
    name: "Otublohum local roads to Circle Pedestrian Shopping Mall",
    purpose: "pedestrian_area_access",
    corridorSequence: [
      "Nsawam Road",
      "Otublohum local roads",
      "Circle Pedestrian Shopping Mall"
    ],
    status: "topology_reference",
    designNote: "The interchange project report identifies local Otublohum roads connecting Nsawam Road with the Pedestrian Mall. Preserve pedestrian priority at the mall edge."
  },
  {
    id: "circle-ground-ring-road-east-to-feo-oye-o",
    name: "Ring Road East to Feo Oyeo connection",
    purpose: "ring_road_connection",
    corridorSequence: [
      "Ring Road East",
      "Feo Oyeo intersection",
      "Ring Road West"
    ],
    status: "topology_reference",
    designNote: "The Circle project description identifies rehabilitation of Ring Road East to the Feo Oyeo intersection on Ring Road West. The detailed at-grade/elevated relationship still requires local layout review."
  }
] as const;

export function isCircleGroundAccessCatalogueValid(): boolean {
  const ids = new Set(CIRCLE_GROUND_ACCESS_ROUTES.map((route) => route.id));
  return CIRCLE_GROUND_ACCESS_ROUTES.length === 3 &&
    ids.size === CIRCLE_GROUND_ACCESS_ROUTES.length &&
    CIRCLE_GROUND_ACCESS_ROUTES.every((route) =>
      route.name.trim().length > 0 &&
      route.corridorSequence.length >= 3 &&
      route.corridorSequence.every((name) => name.trim().length > 0) &&
      route.status === "topology_reference" &&
      route.designNote.trim().length > 0
    ) &&
    CIRCLE_GROUND_ACCESS_ROUTES.find((route) => route.id === "circle-ground-feo-oye-o-to-nsawam-local-access")
      ?.corridorSequence.includes("Obibini Street") === true &&
    CIRCLE_GROUND_ACCESS_ROUTES.find((route) => route.id === "circle-ground-otublohum-to-pedestrian-mall")
      ?.corridorSequence.includes("Circle Pedestrian Shopping Mall") === true;
}
