import {
  getRoadCrossSectionWidth,
  isValidRoadCrossSectionProfile,
  isValidRoadSegmentDesign,
  type RoadCrossSectionProfile,
  type RoadSegmentDesign
} from "@akwantuo/shared";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

/**
 * Reusable first-pass road cross-sections.
 * All dimensions are design targets in metres for the game, not surveyed standards.
 */
export const ROAD_CROSS_SECTION_PROFILES: readonly RoadCrossSectionProfile[] = [
  {
    id: "urban-expressway",
    name: "Urban expressway / dual carriageway",
    surface: "asphalt",
    sidewalkSurface: "concrete",
    drainageStyle: "covered_channel",
    lanesPerDirection: 2,
    laneWidthM: 3.5,
    shoulderWidthM: 2.5,
    medianWidthM: 4,
    sidewalkWidthM: 0,
    drainageWidthM: 0.75,
    designNote: "Separated carriageways, wide outer shoulders, central median and controlled access. Pedestrian access is kept off the main carriageway."
  },
  {
    id: "major-urban-arterial",
    name: "Major urban arterial",
    surface: "asphalt",
    sidewalkSurface: "paving_blocks",
    drainageStyle: "covered_channel",
    lanesPerDirection: 2,
    laneWidthM: 3.25,
    shoulderWidthM: 0.5,
    medianWidthM: 1.5,
    sidewalkWidthM: 2,
    drainageWidthM: 0.5,
    designNote: "High-capacity urban road with a median, pedestrian sidewalks and covered edge drainage where frontage access is dense."
  },
  {
    id: "urban-collector",
    name: "Urban collector road",
    surface: "asphalt",
    sidewalkSurface: "concrete",
    drainageStyle: "open_channel",
    lanesPerDirection: 1,
    laneWidthM: 3.25,
    shoulderWidthM: 0.5,
    medianWidthM: 0,
    sidewalkWidthM: 1.8,
    drainageWidthM: 0.45,
    designNote: "Two-way neighbourhood connector with pedestrian space and visible side drains where appropriate."
  },
  {
    id: "local-street",
    name: "Local neighbourhood street",
    surface: "asphalt",
    sidewalkSurface: "concrete",
    drainageStyle: "open_channel",
    lanesPerDirection: 1,
    laneWidthM: 3,
    shoulderWidthM: 0.25,
    medianWidthM: 0,
    sidewalkWidthM: 1.5,
    drainageWidthM: 0.35,
    designNote: "Compact two-way street; sidewalks and drains can narrow or vary by frontage during detailed district design."
  },
  {
    id: "rural-connector",
    name: "Rural / peri-urban connector",
    surface: "asphalt",
    sidewalkSurface: "concrete",
    drainageStyle: "open_channel",
    lanesPerDirection: 1,
    laneWidthM: 3.25,
    shoulderWidthM: 1,
    medianWidthM: 0,
    sidewalkWidthM: 0,
    drainageWidthM: 0.6,
    designNote: "Two-way connector with shoulders and roadside drainage; settlement sections may later gain sidewalks."
  },
  {
    id: "unpaved-access-road",
    name: "Unpaved local access road",
    surface: "compacted_earth",
    sidewalkSurface: "concrete",
    drainageStyle: "open_channel",
    lanesPerDirection: 1,
    laneWidthM: 2.8,
    shoulderWidthM: 0.5,
    medianWidthM: 0,
    sidewalkWidthM: 0,
    drainageWidthM: 0.5,
    designNote: "Low-speed access road for selected outskirts and construction/farm access; not assigned to the primary paved corridors."
  }
] as const;

/** Initial profile assignments; exact widths and local variations are refined with map geometry. */
export const GREATER_ACCRA_ROAD_DESIGNS: readonly RoadSegmentDesign[] = [
  { roadSegmentId: "n1-west-approach", crossSectionProfileId: "urban-expressway", status: "planned" },
  { roadSegmentId: "n1-central-approach", crossSectionProfileId: "urban-expressway", status: "planned" },
  { roadSegmentId: "n1-tema-corridor", crossSectionProfileId: "urban-expressway", status: "planned" },
  { roadSegmentId: "n6-achimota-ofankor", crossSectionProfileId: "urban-expressway", status: "planned" },
  { roadSegmentId: "n6-nsawam-expansion", crossSectionProfileId: "rural-connector", status: "planned" },
  { roadSegmentId: "n4-madina-approach", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "n4-adenta-corridor", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "liberation-road", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "ring-road-central", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "ring-road-coastal", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "la-beach-road", crossSectionProfileId: "urban-collector", status: "planned" },
  { roadSegmentId: "spintex-road", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "spintex-tema-connection", crossSectionProfileId: "major-urban-arterial", status: "planned" },
  { roadSegmentId: "n2-prampram-expansion", crossSectionProfileId: "rural-connector", status: "planned" }
] as const;

export function getRoadCrossSectionProfile(profileId: string): RoadCrossSectionProfile | undefined {
  return ROAD_CROSS_SECTION_PROFILES.find((profile) => profile.id === profileId);
}

export function getRoadDesignWidth(roadSegmentId: string): number | undefined {
  const design = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === roadSegmentId);
  const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
  return profile ? getRoadCrossSectionWidth(profile) : undefined;
}

export function isGreaterAccraRoadDesignCatalogueValid(): boolean {
  const profilesValid = ROAD_CROSS_SECTION_PROFILES.every(isValidRoadCrossSectionProfile);
  const profileIds = new Set(ROAD_CROSS_SECTION_PROFILES.map((profile) => profile.id));
  const assignedSegments = new Set(GREATER_ACCRA_ROAD_DESIGNS.map((design) => design.roadSegmentId));
  return profilesValid &&
    profileIds.size === ROAD_CROSS_SECTION_PROFILES.length &&
    assignedSegments.size === GREATER_ACCRA_ROAD_DESIGNS.length &&
    GREATER_ACCRA_ROAD_DESIGNS.every((design) =>
      isValidRoadSegmentDesign(design, GREATER_ACCRA_ROAD_NETWORK, ROAD_CROSS_SECTION_PROFILES)
    );
}
