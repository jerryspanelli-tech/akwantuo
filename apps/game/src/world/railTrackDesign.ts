import { GREATER_ACCRA_RAIL_ROUTES } from "./railNetwork";

export type RailTrackDesignProfile = Readonly<{
  id: string;
  name: string;
  gaugeM: 1.067;
  ballastWidthM: number;
  sleeperLengthM: number;
  sleeperWidthM: number;
  sleeperHeightM: number;
  sleeperSpacingM: number;
  railRadiusM: number;
  status: "prototype" | "planned";
  designNote: string;
}>;

/**
 * Visual track proportions for the first Greater Accra prototype.
 * Gauge is the documented 1,067 mm Cape gauge; all other dimensions are
 * presentation targets and are not construction specifications.
 */
export const GREATER_ACCRA_TRACK_PROFILE: RailTrackDesignProfile = {
  id: "ghana-cape-gauge-visual",
  name: "Ghana Cape-gauge visual track",
  gaugeM: 1.067,
  ballastWidthM: 3.2,
  sleeperLengthM: 2.5,
  sleeperWidthM: 0.24,
  sleeperHeightM: 0.16,
  sleeperSpacingM: 0.7,
  railRadiusM: 0.07,
  status: "prototype",
  designNote: "1,067 mm Cape gauge is the documented Ghana Eastern Line gauge. Ballast, sleeper, rail and spacing dimensions are simplified visual targets for the game, not railway construction standards."
};

export type RailTrackRouteDesign = Readonly<{
  routeId: string;
  profileId: string;
  status: "prototype" | "planned";
  firstRelease: boolean;
  designNote: string;
}>;

/** Route-level track assignments; future Nsawam remains outside release one. */
export const GREATER_ACCRA_TRACK_DESIGNS: readonly RailTrackRouteDesign[] =
  GREATER_ACCRA_RAIL_ROUTES.map((route) => ({
    routeId: route.id,
    profileId: GREATER_ACCRA_TRACK_PROFILE.id,
    status: "planned",
    firstRelease: route.firstRelease,
    designNote: route.firstRelease
      ? "Schematic track geometry follows the current game route centreline; verify against current railway mapping before final placement."
      : "Future corridor only; excluded from first-release geometry."
  }));

export function getRailTrackDesign(routeId: string): RailTrackRouteDesign | undefined {
  return GREATER_ACCRA_TRACK_DESIGNS.find((design) => design.routeId === routeId);
}

export function isGreaterAccraTrackDesignValid(): boolean {
  const routeIds = new Set(GREATER_ACCRA_RAIL_ROUTES.map((route) => route.id));
  const designIds = new Set(GREATER_ACCRA_TRACK_DESIGNS.map((design) => design.routeId));
  return GREATER_ACCRA_TRACK_PROFILE.gaugeM === 1.067 &&
    GREATER_ACCRA_TRACK_PROFILE.ballastWidthM > GREATER_ACCRA_TRACK_PROFILE.gaugeM &&
    GREATER_ACCRA_TRACK_PROFILE.sleeperLengthM > GREATER_ACCRA_TRACK_PROFILE.gaugeM &&
    GREATER_ACCRA_TRACK_PROFILE.sleeperSpacingM > 0 &&
    GREATER_ACCRA_TRACK_PROFILE.railRadiusM > 0 &&
    routeIds.size === designIds.size &&
    GREATER_ACCRA_TRACK_DESIGNS.every((design) => {
      const route = GREATER_ACCRA_RAIL_ROUTES.find((item) => item.id === design.routeId);
      return !!route &&
        design.profileId === GREATER_ACCRA_TRACK_PROFILE.id &&
        design.firstRelease === route.firstRelease &&
        (design.status !== "prototype" || route.firstRelease);
    });
}
