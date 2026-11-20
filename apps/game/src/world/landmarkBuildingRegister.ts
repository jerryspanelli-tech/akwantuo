import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "./greaterAccraLandmarkData";

/**
 * Visual brief for upgrading landmarks that already occupy the world.
 * Footprints and positions remain owned by greaterAccraLandmarkData.ts so
 * visual work cannot silently create a second copy or move an existing site.
 */
export type LandmarkBuildingSpec = Readonly<{
  landmarkId: string;
  displayName: string;
  architecturalType:
    | "mixed-use-towers"
    | "commercial-mall"
    | "airport-terminal"
    | "sports-stadium"
    | "university-campus"
    | "memorial-park"
    | "performing-arts-centre";
  massing: readonly string[];
  facade: readonly string[];
  signatureFeatures: readonly string[];
  siteDetails: readonly string[];
  upgradePriority: 1 | 2 | 3;
}>;

export const EXISTING_LANDMARK_BUILDING_REGISTER: readonly LandmarkBuildingSpec[] = [
  {
    landmarkId: "villaggio-vista",
    displayName: "Villaggio Vista",
    architecturalType: "mixed-use-towers",
    massing: [
      "Retain the existing three-tower composition and footprint.",
      "Give each tower a distinct stepped height and slender modern profile.",
      "Keep the shared podium and central open space readable from street level."
    ],
    facade: [
      "Use warm neutral cladding with large blue-green glazed areas.",
      "Add repeated balcony bands, recessed window bays and vertical facade fins.",
      "Use restrained Ghana-inspired geometric accents rather than decorative patterns on every surface."
    ],
    signatureFeatures: [
      "Three recognisable tower silhouettes.",
      "Layered balconies and roof crowns.",
      "A clearly visible central atrium between the wings."
    ],
    siteDetails: [
      "Keep the existing entrance and forecourt within the current footprint.",
      "Add planted edges and pedestrian access without blocking nearby roads."
    ],
    upgradePriority: 2
  },
  {
    landmarkId: "the-signature",
    displayName: "The Signature",
    architecturalType: "mixed-use-towers",
    massing: [
      "Preserve the existing site and two-tower composition.",
      "Make the towers tall, narrow and visibly separate instead of one broad block.",
      "Use a refined podium to connect the towers at ground level."
    ],
    facade: [
      "Use reflective blue-grey glass with pale structural framing.",
      "Repeat floor lines consistently and add vertical corner fins.",
      "Keep rooftop crowns and mechanical screens slim."
    ],
    signatureFeatures: [
      "Two distinct high-rise silhouettes.",
      "A clean glazed facade with strong vertical rhythm.",
      "A landscaped entrance plaza."
    ],
    siteDetails: [
      "Keep the current footprint and access approach.",
      "Do not place extra towers or buildings outside the existing site."
    ],
    upgradePriority: 2
  },
  {
    landmarkId: "accra-mall",
    displayName: "Accra Mall",
    architecturalType: "commercial-mall",
    massing: [
      "Keep the existing low-rise, wide retail complex.",
      "Break the long mass into connected wings and a legible main entrance.",
      "Avoid turning the mall into a high-rise office building."
    ],
    facade: [
      "Use light warm cladding, broad glazed shopfronts and shaded entrance glazing.",
      "Add a visible roof edge, service doors and varied storefront bays.",
      "Use restrained red signage accents without oversized text panels."
    ],
    signatureFeatures: [
      "A wide central public entrance.",
      "Long retail wings with repeated shopfront rhythm.",
      "A clearly defined drop-off and parking-facing frontage."
    ],
    siteDetails: [
      "Retain the existing mall footprint and forecourt zone.",
      "Keep parking and vehicle circulation legible; do not cover the access roads."
    ],
    upgradePriority: 1
  },
  {
    landmarkId: "kotoka-airport",
    displayName: "Kotoka International Airport",
    architecturalType: "airport-terminal",
    massing: [
      "Preserve the existing airport site and long terminal footprint.",
      "Shape the terminal as a broad, low-rise building with connected concourse volumes.",
      "Keep the air-traffic-control tower visually separate from the terminal."
    ],
    facade: [
      "Use pale stone or metal cladding with broad bands of blue-green curtain glazing.",
      "Add repeated structural bays, shaded glass and a strong departures canopy.",
      "Use clear landside entrance zones and restrained airport wayfinding."
    ],
    signatureFeatures: [
      "A long terminal roofline.",
      "A prominent glazed departures frontage and covered kerbside canopy.",
      "A distinct control tower with glazed observation room."
    ],
    siteDetails: [
      "Keep the existing terminal footprint and access roads.",
      "Do not add runway or apron geometry inside the terminal building footprint."
    ],
    upgradePriority: 1
  },
  {
    landmarkId: "accra-sports-stadium",
    displayName: "Accra Sports Stadium",
    architecturalType: "sports-stadium",
    massing: [
      "Keep the existing stadium footprint and oval bowl form.",
      "Build visible seating tiers around the pitch rather than a solid cylinder.",
      "Use roof canopies over the main stands while leaving the field open to the sky."
    ],
    facade: [
      "Use concrete seating structure with darker access openings and visible stand divisions.",
      "Add roof trusses and a light canopy edge.",
      "Use national-colour accents sparingly for entrances and wayfinding."
    ],
    signatureFeatures: [
      "A visible green football pitch and surrounding running track.",
      "Tiered seating bowl with open corners or readable stand breaks.",
      "Covered grandstand roof and floodlight masts."
    ],
    siteDetails: [
      "Keep the existing stadium centre and footprint.",
      "Preserve pedestrian perimeter access and nearby road clearance."
    ],
    upgradePriority: 1
  },
  {
    landmarkId: "university-of-ghana",
    displayName: "University of Ghana",
    architecturalType: "university-campus",
    massing: [
      "Keep the existing campus landmark site.",
      "Use a recognisable main-hall composition with a central tower and lower academic wings.",
      "Represent a campus institution, not a generic office tower."
    ],
    facade: [
      "Use warm pale masonry or rendered concrete, shaded corridors and repeated window bays.",
      "Add deep roof overhangs and arcaded or colonnaded ground-floor sections.",
      "Keep the architectural language restrained and tropical."
    ],
    signatureFeatures: [
      "A distinct central hall or clock-tower element.",
      "Low academic wings framing a landscaped forecourt.",
      "A visible campus identity sign."
    ],
    siteDetails: [
      "Keep the existing campus footprint and approach.",
      "Use trees and shaded pedestrian paths within the site boundary."
    ],
    upgradePriority: 3
  },
  {
    landmarkId: "kwame-nkrumah-memorial",
    displayName: "Kwame Nkrumah Memorial Park",
    architecturalType: "memorial-park",
    massing: [
      "Keep the existing memorial site and central mausoleum position.",
      "Give the mausoleum a sculptural, tapering profile with a distinctive star-inspired crown.",
      "Keep the surrounding park open and low-rise."
    ],
    facade: [
      "Use dark polished stone or deep green-black cladding with subtle reflective surfaces.",
      "Add carefully spaced vertical ribs and a crisp roof silhouette.",
      "Keep museum and visitor elements low and visually secondary."
    ],
    signatureFeatures: [
      "A distinctive central mausoleum.",
      "A reflecting pool and symmetrical approach.",
      "Open lawns, trees and a formal pedestrian forecourt."
    ],
    siteDetails: [
      "Retain the current memorial footprint.",
      "Keep the pool, paths and planting clear of the surrounding streets."
    ],
    upgradePriority: 2
  },
  {
    landmarkId: "national-theatre",
    displayName: "National Theatre",
    architecturalType: "performing-arts-centre",
    massing: [
      "Keep the existing National Theatre footprint.",
      "Replace simple box-like masses with the building's distinctive sculptural, ship-like overlapping forms.",
      "Use a strong central entrance volume and balanced side shells."
    ],
    facade: [
      "Use pale concrete or light stone surfaces with deep shadow lines.",
      "Add curved or faceted shell forms and broad glazed entrance areas.",
      "Keep roof edges expressive but structurally believable."
    ],
    signatureFeatures: [
      "Distinctive sculptural roof and shell forms.",
      "A broad glazed public entrance.",
      "A formal forecourt with steps and pedestrian approach."
    ],
    siteDetails: [
      "Keep the existing theatre footprint and central position.",
      "Preserve the current road and pedestrian access around the site."
    ],
    upgradePriority: 1
  }
];

/** True only when every existing landmark has one and only one visual brief. */
export function isExistingLandmarkBuildingRegisterValid(): boolean {
  const registeredIds = EXISTING_LANDMARK_BUILDING_REGISTER.map((item) => item.landmarkId);
  const footprintIds = GREATER_ACCRA_LANDMARK_FOOTPRINTS.map((item) => item.id);
  const uniqueIds = new Set(registeredIds);

  return registeredIds.length === footprintIds.length &&
    uniqueIds.size === registeredIds.length &&
    footprintIds.every((id) => uniqueIds.has(id)) &&
    EXISTING_LANDMARK_BUILDING_REGISTER.every((item) =>
      item.displayName.length > 0 &&
      item.massing.length > 0 &&
      item.facade.length > 0 &&
      item.signatureFeatures.length > 0 &&
      item.siteDetails.length > 0
    );
}
