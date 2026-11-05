# World data model

AKWANTUO keeps world identity separate from map geometry.

## Shared contracts

`packages/shared/src/world.ts` defines:

- **WorldRegion** — a country, metropolitan area, district, neighbourhood or town, with a stable ID and optional parent.
- **WorldLocation** — a named place such as a landmark, transport hub, market, beach, public service or business area.
- **WorldRoad** — a named road with a road class and the regions it connects.
- **WorldContentStatus** — planned, prototype or implemented.

The shared package also provides shape checks and cross-reference validation. These checks help catch malformed catalogue data; they are not a substitute for trusted server validation.

## First playable-world scope

`apps/game/src/world/regions.ts` records the approved Greater Accra planning scope:

- Airport / Airport City
- East Legon
- Legon
- Madina / Adenta
- Achimota
- Accra Central / Makola
- Osu
- Labadi
- Dansoman
- Kaneshie
- Spintex
- Tema

These are planning entries only. They do not define official administrative boundaries, map coordinates, distances, road alignments or travel times.

## Spatial-data rule

Do not assign world-space positions or road paths until the map layout is deliberately designed and reviewed. The future map stage will add coastline, road geometry, junctions, district boundaries, landmarks and connections using the agreed Greater Accra geography. The later Kumasi corridor will extend the same data model rather than require a new one.
