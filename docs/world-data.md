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

## Primary road-network foundation

`apps/game/src/world/roadNetwork.ts` contains a topology-only first pass for the major Greater Accra corridors:

- N1 western, central and Tema-facing segments
- N6 Achimota–Ofankor, with a separate future Nsawam expansion gateway
- N4 Madina–Adenta
- Liberation Road
- Ring Road Central and the coastal connection
- La Beach Road
- Spintex Road and its Tema connection
- A future N2 eastern expansion gateway beyond Tema

The network is represented as **nodes** (junctions, interchanges, area connections and expansion gateways) joined by **segments**. Stable IDs make it possible to attach later systems such as GPS/minimap routing, traffic, road surfaces, navigation and vehicle pathfinding.

This is a planning topology, not a surveyed road map. The segment sequence records intended connections only. It does not claim exact alignment, lane count, road width, travel time, junction geometry or GPS accuracy. Those are map-design tasks for the geography stage. The Nsawam and Prampram exits are marked as future expansion links rather than completed playable routes.

The catalogue exports a validation function that checks duplicate IDs, missing node/region references, invalid road classes and expansion-gateway consistency.

## Junction and road-structure foundation

`packages/shared/src/world.ts` now defines junction design archetypes:

- Roundabout
- Signal-controlled junction
- Priority-controlled junction
- Grade-separated interchange
- Merge / diverge
- To be designed

It also defines bridge, overpass, underpass and tunnel structure records. Validation ensures each junction references a real network node and at least two connected road segments that actually meet at that node. Road structures must reference valid road segments.

`apps/game/src/world/junctions.ts` records the initial major junction planning set: Kaneshie, Kwame Nkrumah Circle, 37 / Ridge, Tetteh Quarshie, Madina, Osu, Spintex and the Tema connection.

The entries marked **to be designed** deliberately do not guess whether a real-world junction should be a roundabout or traffic-light junction. The known major interchange locations reserve a grade-separated design concept, but ramp geometry and exact approach roads still require map review.

The bridge/overpass catalogue is currently empty by design. No bridge or flyover is placed based on guesswork. During the geography and road-layout stage, actual crossings will be identified and added with their connected road segments.

Junctions will eventually support lane approach definitions, turning movements, traffic lights, pedestrian crossings, roundabout circulation, merging lanes, ramp connections and vehicle navigation. Those simulation details are not implemented yet.

## Road geometry design profiles

`packages/shared/src/world.ts` now defines reusable road cross-section profiles and segment-to-profile assignments. A profile describes:

- Lane count per direction and lane width
- Outer shoulder width
- Central median width
- Sidewalk width and surface material
- Drainage width and drainage style
- Main carriageway surface

`apps/game/src/world/roadDesign.ts` contains six reusable first-pass profiles:

| Profile | Intended use | Target total width |
|---|---|---:|
| Urban expressway | N1 / N6 primary highway sections | 21.5 m |
| Major urban arterial | N4, Liberation, Ring Road, Spintex | 20.5 m |
| Urban collector | Smaller connecting roads | 12.0 m |
| Local street | Neighbourhood streets | 10.2 m |
| Rural connector | Future outer-corridor sections | 8.5 m |
| Unpaved access road | Selected low-speed access routes | 7.1 m |

Total width is calculated from the component dimensions rather than separately typed, so the displayed result stays consistent with the profile.

These are **game design targets**, not claims about actual Ghana road engineering standards or measured widths. Real sections vary along a route. At map-design time, the team can make local variations for frontage access, roadside markets, bus stops, bridges, drainage constraints and available right-of-way.

The profiles include both open side drains and covered drainage channels. They also distinguish asphalt, concrete, compacted-earth and paving-block surfaces. The unpaved profile is available for selected outskirts and access tracks, but is not assigned to the main paved highway corridors.

No visible 3D road geometry has been generated by this step. Lane markings, kerbs, sidewalks, medians, drains, shoulders and surface meshes will be built after the route alignment and junction footprints are approved.
