/**
 * Research-informed concept catalogue for Kwame Nkrumah Circle.
 *
 * Public project descriptions identify three elevated links:
 * - Akasanoma Road to Nsawam Road
 * - Nsawam Road to Kwame Nkrumah Avenue
 * - Ring Road Central to Ring Road West
 *
 * A roundabout remains at ground level. This catalogue records the intended
 * corridor relationships only; it does not invent ramp coordinates, deck
 * heights, pier positions, lane geometry or surveyed engineering dimensions.
 */

export type CircleFlyoverLink = Readonly<{
  id: string;
  name: string;
  fromCorridor: string;
  toCorridor: string;
  level: "first_elevated" | "second_elevated";
  status: "planned";
  designNote: string;
}>;

export type CircleStructureReference = Readonly<{
  id: string;
  name: string;
  structureKind: "viaduct" | "ramp" | "bridge";
  lengthM: number;
  deckWidthM: number;
  source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016";
  status: "reference_only";
}>;

export type CircleGroundLevelLayout = Readonly<{
  id: string;
  name: string;
  kind: "roundabout";
  level: "ground";
  status: "planned";
  designNote: string;
}>;

export const CIRCLE_INTERCHANGE_FLYOVER_LINKS: readonly CircleFlyoverLink[] = [
  {
    id: "circle-akasanoma-to-nsawam-flyover",
    name: "Akasanoma Road to Nsawam Road Flyover",
    fromCorridor: "Akasanoma Road",
    toCorridor: "Nsawam Road",
    level: "first_elevated",
    status: "planned",
    designNote: "First-level flyover corridor reported in the Circle interchange project description; exact ramp geometry remains to be authored."
  },
  {
    id: "circle-nsawam-to-nkrumah-avenue-flyover",
    name: "Nsawam Road to Kwame Nkrumah Avenue Flyover",
    fromCorridor: "Nsawam Road",
    toCorridor: "Kwame Nkrumah Avenue",
    level: "first_elevated",
    status: "planned",
    designNote: "First-level flyover corridor reported in the Circle interchange project description; exact ramp geometry remains to be authored."
  },
  {
    id: "circle-ring-road-central-to-west-flyover",
    name: "Ring Road Central to Ring Road West Flyover",
    fromCorridor: "Ring Road Central",
    toCorridor: "Ring Road West",
    level: "second_elevated",
    status: "planned",
    designNote: "Second-level Ring Road flyover reported in the project description; exact ramp geometry and structural elevations remain to be authored."
  }
] as const;

/**
 * Dimensions transcribed from the structural consultant's 2016 project sheet.
 * They are reference dimensions, not a complete 3D alignment or a claim that
 * every listed structure is a separate flyover corridor.
 */
export const CIRCLE_STRUCTURE_REFERENCES: readonly CircleStructureReference[] = [
  { id: "circle-ring-road-main-viaduct", name: "Ring Road Main Viaduct", structureKind: "viaduct", lengthM: 925, deckWidthM: 24, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-feo-oye-o-ramp-down", name: "Ramp Down at Feo Oyeo", structureKind: "ramp", lengthM: 141.5, deckWidthM: 6.5, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-feo-oye-o-ramp-up", name: "Ramp Up at Feo Oyeo", structureKind: "ramp", lengthM: 143, deckWidthM: 6.5, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-loop-viaduct", name: "Interchange Loop Viaduct", structureKind: "viaduct", lengthM: 323, deckWidthM: 9.2, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-akasanoma-viaduct", name: "Akasanoma Viaduct", structureKind: "viaduct", lengthM: 168.3, deckWidthM: 9.2, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-nsawam-viaduct", name: "Nsawam Viaduct", structureKind: "viaduct", lengthM: 167.8, deckWidthM: 9.2, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-bridge-1", name: "Interchange Bridge 1", structureKind: "bridge", lengthM: 34.5, deckWidthM: 11.65, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-bridge-2", name: "Interchange Bridge 2", structureKind: "bridge", lengthM: 34.5, deckWidthM: 18.15, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" },
  { id: "circle-bridge-3", name: "Interchange Bridge 3", structureKind: "bridge", lengthM: 35.2, deckWidthM: 12.3, source: "FHECOR_Dr_Kwame_Nkrumah_Interchange_2016", status: "reference_only" }
] as const;

export const CIRCLE_GROUND_LEVEL_LAYOUT: CircleGroundLevelLayout = {
  id: "circle-ground-level-roundabout",
  name: "Kwame Nkrumah Circle Ground-Level Roundabout",
  kind: "roundabout",
  level: "ground",
  status: "planned",
  designNote: "Ground-level roundabout retained beneath/alongside the elevated links; island shape, entries, exits, crossings and traffic control are not yet designed."
};

export function isCircleInterchangeConceptValid(): boolean {
  const ids = new Set(CIRCLE_INTERCHANGE_FLYOVER_LINKS.map((link) => link.id));
  const expectedPairs = new Set([
    "Akasanoma Road|Nsawam Road",
    "Nsawam Road|Kwame Nkrumah Avenue",
    "Ring Road Central|Ring Road West"
  ]);
  return CIRCLE_INTERCHANGE_FLYOVER_LINKS.length === 3 &&
    ids.size === CIRCLE_INTERCHANGE_FLYOVER_LINKS.length &&
    CIRCLE_INTERCHANGE_FLYOVER_LINKS.every((link) =>
      (link.level === "first_elevated" || link.level === "second_elevated") &&
      link.status === "planned" &&
      link.fromCorridor.trim().length > 0 &&
      link.toCorridor.trim().length > 0 &&
      expectedPairs.has(`${link.fromCorridor}|${link.toCorridor}`)
    ) &&
    CIRCLE_STRUCTURE_REFERENCES.length === 9 &&
    new Set(CIRCLE_STRUCTURE_REFERENCES.map((structure) => structure.id)).size === CIRCLE_STRUCTURE_REFERENCES.length &&
    CIRCLE_STRUCTURE_REFERENCES.every((structure) =>
      structure.lengthM > 0 &&
      structure.deckWidthM > 0 &&
      Number.isFinite(structure.lengthM) &&
      Number.isFinite(structure.deckWidthM) &&
      structure.status === "reference_only"
    ) &&
    CIRCLE_INTERCHANGE_FLYOVER_LINKS.find((link) => link.id === "circle-akasanoma-to-nsawam-flyover")?.level === "first_elevated" &&
    CIRCLE_INTERCHANGE_FLYOVER_LINKS.find((link) => link.id === "circle-nsawam-to-nkrumah-avenue-flyover")?.level === "first_elevated" &&
    CIRCLE_INTERCHANGE_FLYOVER_LINKS.find((link) => link.id === "circle-ring-road-central-to-west-flyover")?.level === "second_elevated" &&
    CIRCLE_GROUND_LEVEL_LAYOUT.kind === "roundabout" &&
    CIRCLE_GROUND_LEVEL_LAYOUT.level === "ground" &&
    CIRCLE_GROUND_LEVEL_LAYOUT.status === "planned" &&
    isCircleApproachCatalogueValid() &&
    isCircleSiteConstraintCatalogueValid();
}

/**
 * Named approach corridors that must be represented around Circle before
 * authored geometry is approved. These records deliberately do not assign
 * game coordinates or claim one-to-one correspondence with the simplified
 * Greater Accra primary-road graph.
 */
export type CircleApproachCorridor = Readonly<{
  id: string;
  name: string;
  role: "cbd_approach" | "northern_approach" | "southern_departure" | "ring_road_central" | "ring_road_west";
  relatedFlyoverLinkIds: readonly string[];
  groundLevelConnection: boolean;
  mapStatus: "not_yet_mapped";
  designNote: string;
}>;

export const CIRCLE_APPROACH_CORRIDORS: readonly CircleApproachCorridor[] = [
  {
    id: "circle-approach-akasanoma-road",
    name: "Akasanoma Road",
    role: "cbd_approach",
    relatedFlyoverLinkIds: ["circle-akasanoma-to-nsawam-flyover"],
    groundLevelConnection: true,
    mapStatus: "not_yet_mapped",
    designNote: "The Accra CBD–Amasaman corridor report describes the northbound CBD route entering Circle via Akasanoma Road; exact local alignment still needs map review."
  },
  {
    id: "circle-approach-nsawam-road",
    name: "Nsawam Road",
    role: "northern_approach",
    relatedFlyoverLinkIds: [
      "circle-akasanoma-to-nsawam-flyover",
      "circle-nsawam-to-nkrumah-avenue-flyover"
    ],
    groundLevelConnection: true,
    mapStatus: "not_yet_mapped",
    designNote: "Northern corridor appears in both reported elevated links; do not substitute the distant future Nsawam expansion gateway for this Circle approach."
  },
  {
    id: "circle-approach-kwame-nkrumah-avenue",
    name: "Kwame Nkrumah Avenue",
    role: "southern_departure",
    relatedFlyoverLinkIds: ["circle-nsawam-to-nkrumah-avenue-flyover"],
    groundLevelConnection: true,
    mapStatus: "not_yet_mapped",
    designNote: "The CBD–Amasaman corridor report describes the southbound return leaving Circle via Kwame Nkrumah Avenue toward Tudu; exact local alignment remains to be authored."
  },
  {
    id: "circle-approach-ring-road-central",
    name: "Ring Road Central",
    role: "ring_road_central",
    relatedFlyoverLinkIds: ["circle-ring-road-central-to-west-flyover"],
    groundLevelConnection: true,
    mapStatus: "not_yet_mapped",
    designNote: "One side of the elevated Ring Road Central-to-West connection; the current simplified Ring Road Central centreline is not yet a detailed Circle approach."
  },
  {
    id: "circle-approach-ring-road-west",
    name: "Ring Road West",
    role: "ring_road_west",
    relatedFlyoverLinkIds: ["circle-ring-road-central-to-west-flyover"],
    groundLevelConnection: true,
    mapStatus: "not_yet_mapped",
    designNote: "Other side of the elevated Ring Road Central-to-West connection; its distinct route must not be collapsed into the N1 western approach."
  }
] as const;

export function isCircleApproachCatalogueValid(): boolean {
  const corridorIds = new Set(CIRCLE_APPROACH_CORRIDORS.map((corridor) => corridor.id));
  const flyoverIds = new Set(CIRCLE_INTERCHANGE_FLYOVER_LINKS.map((link) => link.id));
  return CIRCLE_APPROACH_CORRIDORS.length === 5 &&
    corridorIds.size === CIRCLE_APPROACH_CORRIDORS.length &&
    CIRCLE_APPROACH_CORRIDORS.every((corridor) =>
      corridor.name.trim().length > 0 &&
      corridor.groundLevelConnection &&
      corridor.mapStatus === "not_yet_mapped" &&
      corridor.relatedFlyoverLinkIds.length > 0 &&
      corridor.relatedFlyoverLinkIds.every((id) => flyoverIds.has(id))
    ) &&
    CIRCLE_APPROACH_CORRIDORS.find((corridor) => corridor.id === "circle-approach-nsawam-road")?.relatedFlyoverLinkIds.length === 2;
}

/**
 * Site constraints reported in the original project description. These are
 * required relationships for later geometry, not coordinate-bearing assets.
 */
export type CircleSiteConstraint = Readonly<{
  id: string;
  kind: "river_crossing" | "rail_crossing" | "ground_level_access";
  name: string;
  affectedFlyoverLinkIds: readonly string[];
  requiredOutcome: string;
  status: "design_constraint";
}>;

export const CIRCLE_SITE_CONSTRAINTS: readonly CircleSiteConstraint[] = [
  {
    id: "circle-ring-road-over-odaw-river",
    kind: "river_crossing",
    name: "Odaw River crossing",
    affectedFlyoverLinkIds: ["circle-ring-road-central-to-west-flyover"],
    requiredOutcome: "The Ring Road elevated structure must clear the Odaw River corridor without blocking the river channel or its maintenance access.",
    status: "design_constraint"
  },
  {
    id: "circle-ring-road-over-railway",
    kind: "rail_crossing",
    name: "Railway crossing",
    affectedFlyoverLinkIds: ["circle-ring-road-central-to-west-flyover"],
    requiredOutcome: "The Ring Road elevated structure must clear the existing railway corridor with appropriate vertical clearance; exact levels and span locations remain to be surveyed.",
    status: "design_constraint"
  },
  {
    id: "circle-ground-public-transport-and-pedestrians",
    kind: "ground_level_access",
    name: "Ground-level pedestrian and public-transport access",
    affectedFlyoverLinkIds: ["circle-ring-road-central-to-west-flyover"],
    requiredOutcome: "Keep ground-level space available for pedestrian movement and public-transport operations beneath/alongside the elevated Ring Road; design safe, continuous crossings and terminal access separately.",
    status: "design_constraint"
  }
];

export function isCircleSiteConstraintCatalogueValid(): boolean {
  const flyoverIds = new Set(CIRCLE_INTERCHANGE_FLYOVER_LINKS.map((link) => link.id));
  const ids = new Set(CIRCLE_SITE_CONSTRAINTS.map((constraint) => constraint.id));
  return CIRCLE_SITE_CONSTRAINTS.length === 3 &&
    ids.size === CIRCLE_SITE_CONSTRAINTS.length &&
    CIRCLE_SITE_CONSTRAINTS.every((constraint) =>
      constraint.name.trim().length > 0 &&
      constraint.requiredOutcome.trim().length > 0 &&
      constraint.status === "design_constraint" &&
      constraint.affectedFlyoverLinkIds.length > 0 &&
      constraint.affectedFlyoverLinkIds.every((id) => flyoverIds.has(id))
    ) &&
    CIRCLE_SITE_CONSTRAINTS.some((constraint) => constraint.kind === "river_crossing") &&
    CIRCLE_SITE_CONSTRAINTS.some((constraint) => constraint.kind === "rail_crossing") &&
    CIRCLE_SITE_CONSTRAINTS.some((constraint) => constraint.kind === "ground_level_access");
}

/** Named corridor sequences for the key through-movements at Circle. */
export type CircleThroughMovement = Readonly<{
  id: string;
  name: string;
  travelDirection: "toward_north" | "toward_south" | "ring_road_westbound" | "ring_road_eastbound";
  level: "ground" | "first_elevated" | "second_elevated";
  corridorSequence: readonly string[];
  status: "topology_reference";
}>;

export const CIRCLE_THROUGH_MOVEMENTS: readonly CircleThroughMovement[] = [
  {
    id: "circle-cbd-to-amasaman-northbound",
    name: "CBD–Amasaman northbound corridor",
    travelDirection: "toward_north",
    level: "first_elevated",
    corridorSequence: ["Tudu", "Kojo Thompson Road", "Akasanoma Road", "Kwame Nkrumah Circle", "Nsawam Road", "Achimota", "Ofankor", "Amasaman"],
    status: "topology_reference"
  },
  {
    id: "circle-amasaman-to-cbd-southbound",
    name: "Amasaman–CBD southbound corridor",
    travelDirection: "toward_south",
    level: "first_elevated",
    corridorSequence: ["Amasaman", "Ofankor", "Achimota", "Nsawam Road", "Kwame Nkrumah Circle", "Kwame Nkrumah Avenue", "Tudu"],
    status: "topology_reference"
  },
  {
    id: "circle-ring-road-westbound",
    name: "Ring Road Central to Ring Road West",
    travelDirection: "ring_road_westbound",
    level: "second_elevated",
    corridorSequence: ["Ring Road Central", "Kwame Nkrumah Circle", "Ring Road West"],
    status: "topology_reference"
  }
] as const;

export function isCircleThroughMovementCatalogueValid(): boolean {
  const ids = new Set(CIRCLE_THROUGH_MOVEMENTS.map((movement) => movement.id));
  const links = new Map(CIRCLE_INTERCHANGE_FLYOVER_LINKS.map((link) => [link.id, link]));
  return CIRCLE_THROUGH_MOVEMENTS.length === 3 &&
    ids.size === CIRCLE_THROUGH_MOVEMENTS.length &&
    CIRCLE_THROUGH_MOVEMENTS.every((movement) =>
      movement.status === "topology_reference" &&
      movement.corridorSequence.length >= 3 &&
      movement.corridorSequence.every((corridor) => corridor.trim().length > 0)
    ) &&
    CIRCLE_THROUGH_MOVEMENTS.find((movement) => movement.id === "circle-cbd-to-amasaman-northbound")?.level ===
      links.get("circle-akasanoma-to-nsawam-flyover")?.level &&
    CIRCLE_THROUGH_MOVEMENTS.find((movement) => movement.id === "circle-amasaman-to-cbd-southbound")?.level ===
      links.get("circle-nsawam-to-nkrumah-avenue-flyover")?.level &&
    CIRCLE_THROUGH_MOVEMENTS.find((movement) => movement.id === "circle-ring-road-westbound")?.level ===
      links.get("circle-ring-road-central-to-west-flyover")?.level;
}

