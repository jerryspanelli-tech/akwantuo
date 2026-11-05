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
  level: "elevated";
  status: "planned";
  designNote: string;
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
    level: "elevated",
    status: "planned",
    designNote: "Elevated corridor relationship reported in the Circle interchange project description; exact ramp geometry remains to be authored."
  },
  {
    id: "circle-nsawam-to-nkrumah-avenue-flyover",
    name: "Nsawam Road to Kwame Nkrumah Avenue Flyover",
    fromCorridor: "Nsawam Road",
    toCorridor: "Kwame Nkrumah Avenue",
    level: "elevated",
    status: "planned",
    designNote: "Elevated corridor relationship reported in the Circle interchange project description; exact ramp geometry remains to be authored."
  },
  {
    id: "circle-ring-road-central-to-west-flyover",
    name: "Ring Road Central to Ring Road West Flyover",
    fromCorridor: "Ring Road Central",
    toCorridor: "Ring Road West",
    level: "elevated",
    status: "planned",
    designNote: "Third elevated connection in the reported interchange scheme; exact ramp geometry and structural levels remain to be authored."
  }
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
      link.level === "elevated" &&
      link.status === "planned" &&
      link.fromCorridor.trim().length > 0 &&
      link.toCorridor.trim().length > 0 &&
      expectedPairs.has(`${link.fromCorridor}|${link.toCorridor}`)
    ) &&
    CIRCLE_GROUND_LEVEL_LAYOUT.kind === "roundabout" &&
    CIRCLE_GROUND_LEVEL_LAYOUT.level === "ground" &&
    CIRCLE_GROUND_LEVEL_LAYOUT.status === "planned";
}
