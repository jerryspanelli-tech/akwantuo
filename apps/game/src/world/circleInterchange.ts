import { GREATER_ACCRA_JUNCTION_MOVEMENTS } from "./junctionMovements";
import { GREATER_ACCRA_JUNCTION_LAYOUTS } from "./junctionLayouts";

export type InterchangeLevel = "ground" | "elevated";

export type InterchangeDeck = Readonly<{
  id: string;
  junctionId: string;
  name: string;
  level: InterchangeLevel;
  /** Centreline points in local map metres, ordered from west to east. */
  centreline: readonly Readonly<{ x: number; z: number }>[];
  deckHeightM: number;
  deckWidthM: number;
  connectedMovementIds: readonly string[];
  status: "planned";
  designNote: string;
}>;

export type InterchangeSupportReservation = Readonly<{
  id: string;
  deckId: string;
  position: Readonly<{ x: number; z: number }>;
  /** Reserved support clearance radius; not a final pier dimension. */
  clearanceRadiusM: number;
  status: "planned";
}>;

const CIRCLE_ID = "circle-interchange-junction";
const CIRCLE_LAYOUT = GREATER_ACCRA_JUNCTION_LAYOUTS.find((item) => item.junctionId === CIRCLE_ID);

function movementId(incoming: string, outgoing: string): string {
  return `${CIRCLE_ID}--${incoming}--to--${outgoing}`;
}

/**
 * First concept for Circle: keep the N1 west/east through corridor on an
 * elevated deck, leaving the remaining interchange movements for a separate
 * ground-level/ramp design. Coordinates and levels are provisional game units.
 */
export const CIRCLE_INTERCHANGE_DECKS: readonly InterchangeDeck[] = [
  {
    id: "circle-n1-elevated-through-deck",
    junctionId: CIRCLE_ID,
    name: "N1 West–East Elevated Through Deck",
    level: "elevated",
    centreline: [
      { x: -1225, z: 205 },
      { x: -950, z: 285 },
      { x: -650, z: 375 },
      { x: -450, z: 435 },
      { x: -150, z: 465 },
      { x: 175, z: 465 },
      { x: 425, z: 430 }
    ],
    deckHeightM: 7.5,
    deckWidthM: 24.5,
    connectedMovementIds: [
      movementId("n1-central-approach", "n1-tema-corridor"),
      movementId("n1-tema-corridor", "n1-central-approach")
    ],
    status: "planned",
    designNote: "Conceptual elevated N1 through movement; transition ramps, vertical curves, clearances and exact alignment require detailed design."
  }
] as const;

/** Keep support concepts outside the reserved carriageway envelope for now. */
export const CIRCLE_INTERCHANGE_SUPPORT_RESERVATIONS: readonly InterchangeSupportReservation[] = [
  {
    id: "circle-deck-support-west-north",
    deckId: "circle-n1-elevated-through-deck",
    position: { x: -820, z: 690 },
    clearanceRadiusM: 5,
    status: "planned"
  },
  {
    id: "circle-deck-support-east-north",
    deckId: "circle-n1-elevated-through-deck",
    position: { x: -80, z: 690 },
    clearanceRadiusM: 5,
    status: "planned"
  }
] as const;

export function isCircleInterchangeConceptValid(): boolean {
  if (!CIRCLE_LAYOUT || CIRCLE_INTERCHANGE_DECKS.length !== 1) return false;
  const deckIds = new Set(CIRCLE_INTERCHANGE_DECKS.map((deck) => deck.id));
  const circleMovements = new Set(
    GREATER_ACCRA_JUNCTION_MOVEMENTS
      .filter((movement) => movement.junctionId === CIRCLE_ID)
      .map((movement) => movement.id)
  );

  return deckIds.size === CIRCLE_INTERCHANGE_DECKS.length &&
    CIRCLE_INTERCHANGE_DECKS.every((deck) =>
      deck.junctionId === CIRCLE_ID &&
      deck.level === "elevated" &&
      deck.centreline.length >= 2 &&
      deck.centreline.every((point) =>
        Number.isFinite(point.x) && Number.isFinite(point.z) &&
        point.x >= -1225 && point.x <= 425 &&
        point.z >= -100 && point.z <= 1000
      ) &&
      Number.isFinite(deck.deckHeightM) && deck.deckHeightM >= 4 &&
      Number.isFinite(deck.deckWidthM) && deck.deckWidthM > 0 &&
      deck.connectedMovementIds.length === 2 &&
      deck.connectedMovementIds.every((id) => circleMovements.has(id)) &&
      deck.status === "planned"
    ) &&
    CIRCLE_INTERCHANGE_SUPPORT_RESERVATIONS.every((support) =>
      deckIds.has(support.deckId) &&
      Number.isFinite(support.position.x) && Number.isFinite(support.position.z) &&
      Number.isFinite(support.clearanceRadiusM) && support.clearanceRadiusM > 0 &&
      support.status === "planned"
    );
}
