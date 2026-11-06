export type InteriorFixtureType =
  | "counter"
  | "shelf"
  | "chair"
  | "mirror"
  | "table"
  | "bed"
  | "sofa"
  | "desk"
  | "medical_bed"
  | "tool_bench"
  | "display"
  | "stage"
  | "runway"
  | "audience_seating"
  | "screen";

export type InteriorFixture = Readonly<{
  type: InteriorFixtureType;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
}>;

export type InteriorBlueprint = Readonly<{
  id: string;
  displayName: string;
  width: number;
  depth: number;
  wallHeight: number;
  floorStyle: "tile" | "concrete" | "wood";
  fixtures: readonly InteriorFixture[];
}>;

/** Compact first-pass floor plans for the first-release Ghanaian street block. */
export const INTERIOR_BLUEPRINTS: readonly InteriorBlueprint[] = [
  { id: "shop-small", displayName: "Neighbourhood Shop", width: 8, depth: 9, wallHeight: 3.2, floorStyle: "tile", fixtures: [
    { type: "counter", x: 1.8, z: 2.6, rotationY: 0, scale: 1 },
    { type: "shelf", x: -2.8, z: 0.4, rotationY: 0, scale: 1 },
    { type: "shelf", x: -2.8, z: -2.2, rotationY: 0, scale: 1 },
    { type: "display", x: 0, z: -3.2, rotationY: 0, scale: 0.8 }
  ] },
  { id: "salon", displayName: "Hair Studio", width: 9, depth: 9, wallHeight: 3.2, floorStyle: "tile", fixtures: [
    { type: "mirror", x: -2.5, z: -2.7, rotationY: 0, scale: 1 },
    { type: "chair", x: -2.5, z: -1.1, rotationY: 0, scale: 1 },
    { type: "mirror", x: 2.5, z: -2.7, rotationY: 0, scale: 1 },
    { type: "chair", x: 2.5, z: -1.1, rotationY: 0, scale: 1 },
    { type: "counter", x: 0, z: 2.6, rotationY: 0, scale: 0.8 }
  ] },
  { id: "restaurant", displayName: "Chop Bar", width: 10, depth: 10, wallHeight: 3.4, floorStyle: "tile", fixtures: [
    { type: "counter", x: 0, z: -3.4, rotationY: 0, scale: 1.1 },
    { type: "table", x: -2.6, z: 0.2, rotationY: 0, scale: 1 },
    { type: "chair", x: -2.6, z: 1.5, rotationY: 0, scale: 1 },
    { type: "table", x: 2.5, z: 0.2, rotationY: 0, scale: 1 },
    { type: "chair", x: 2.5, z: 1.5, rotationY: 0, scale: 1 }
  ] },
  { id: "compound-house", displayName: "Family Compound Home", width: 11, depth: 10, wallHeight: 3.2, floorStyle: "concrete", fixtures: [
    { type: "sofa", x: 0, z: 1.8, rotationY: 0, scale: 1 },
    { type: "table", x: 0, z: -0.3, rotationY: 0, scale: 0.9 },
    { type: "bed", x: -3.2, z: -2.7, rotationY: 0, scale: 1 },
    { type: "desk", x: 3.1, z: -2.7, rotationY: 0, scale: 0.8 }
  ] },
  { id: "guest-house", displayName: "Guest House Room", width: 10, depth: 10, wallHeight: 3.3, floorStyle: "tile", fixtures: [
    { type: "bed", x: 0, z: -1.4, rotationY: 0, scale: 1.1 },
    { type: "desk", x: -3.1, z: 2.7, rotationY: 0, scale: 0.9 },
    { type: "chair", x: -1.7, z: 2.7, rotationY: 0, scale: 0.9 },
    { type: "display", x: 3.1, z: -3.1, rotationY: 0, scale: 0.7 }
  ] },
  { id: "office", displayName: "Small Business Office", width: 11, depth: 10, wallHeight: 3.4, floorStyle: "tile", fixtures: [
    { type: "desk", x: -2.5, z: -2.5, rotationY: 0, scale: 1 },
    { type: "chair", x: -2.5, z: -1, rotationY: 0, scale: 1 },
    { type: "desk", x: 2.5, z: -2.5, rotationY: 0, scale: 1 },
    { type: "chair", x: 2.5, z: -1, rotationY: 0, scale: 1 },
    { type: "sofa", x: 0, z: 2.7, rotationY: 0, scale: 0.8 }
  ] },
  { id: "clinic", displayName: "Community Clinic", width: 11, depth: 10, wallHeight: 3.4, floorStyle: "tile", fixtures: [
    { type: "counter", x: 0, z: 3, rotationY: 0, scale: 1 },
    { type: "medical_bed", x: -2.8, z: -1.4, rotationY: 0, scale: 1 },
    { type: "medical_bed", x: 2.8, z: -1.4, rotationY: 0, scale: 1 },
    { type: "chair", x: 0, z: -3.2, rotationY: 0, scale: 0.9 }
  ] },
  { id: "workshop", displayName: "Vehicle Repair Workshop", width: 11, depth: 10, wallHeight: 3.5, floorStyle: "concrete", fixtures: [
    { type: "tool_bench", x: -3.2, z: -2.8, rotationY: 0, scale: 1 },
    { type: "tool_bench", x: 3.2, z: -2.8, rotationY: 0, scale: 1 },
    { type: "display", x: 0, z: 3.2, rotationY: 0, scale: 1.2 }
  ] },
  { id: "apartment", displayName: "Modern Apartment", width: 12, depth: 11, wallHeight: 3.4, floorStyle: "tile", fixtures: [
    { type: "sofa", x: 0, z: 2.8, rotationY: 0, scale: 1.1 },
    { type: "table", x: 0, z: 0.8, rotationY: 0, scale: 0.9 },
    { type: "bed", x: -3.2, z: -2.8, rotationY: 0, scale: 1 },
    { type: "desk", x: 3.2, z: -2.8, rotationY: 0, scale: 0.9 },
    { type: "chair", x: 3.2, z: -1.2, rotationY: 0, scale: 0.9 },
    { type: "counter", x: 0, z: -4.3, rotationY: 0, scale: 0.8 }
  ] },
  { id: "creative-arts-centre", displayName: "Akwaaba Creative Arts & Events Hall", width: 32, depth: 28, wallHeight: 12, floorStyle: "concrete", fixtures: [
    { type: "stage", x: 0, z: -10, rotationY: 0, scale: 1 },
    { type: "runway", x: 0, z: -1, rotationY: 0, scale: 1 },
    { type: "screen", x: 0, z: -13, rotationY: 0, scale: 1 },
    { type: "audience_seating", x: -10, z: 2, rotationY: 0, scale: 1 },
    { type: "audience_seating", x: 10, z: 2, rotationY: 0, scale: 1 }
  ] }
] as const;

export function isInteriorBlueprintCatalogueValid(): boolean {
  const ids = new Set(INTERIOR_BLUEPRINTS.map((blueprint) => blueprint.id));
  return ids.size === INTERIOR_BLUEPRINTS.length &&
    INTERIOR_BLUEPRINTS.length >= 9 &&
    INTERIOR_BLUEPRINTS.every((blueprint) =>
      blueprint.id.length > 0 && blueprint.displayName.length > 0 &&
      blueprint.width >= 6 && blueprint.depth >= 6 && blueprint.wallHeight >= 2.5 &&
      blueprint.fixtures.length >= 3 &&
      blueprint.fixtures.every((fixture) =>
        Number.isFinite(fixture.x) && Number.isFinite(fixture.z) &&
        Number.isFinite(fixture.rotationY) && fixture.scale > 0 &&
        Math.abs(fixture.x) < blueprint.width / 2 &&
        Math.abs(fixture.z) < blueprint.depth / 2
      )
    );
}
