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

World-space positions and road paths are now being introduced in a dedicated layout layer. The first pass is a stylised, compressed game map; it is not a GPS survey or official boundary dataset. Coastline, road geometry and district anchors are kept separate from the identity catalogues so they can be refined without changing stable region and road IDs. The later Kumasi corridor will extend the same coordinate system and data model.

## Greater Accra spatial layout — first coordinate pass

`apps/game/src/world/greaterAccraLayout.ts` adds the first shared spatial layout:

- A local metric coordinate system: east is +X, north is +Z, and the Gulf of Guinea coastline lies to the south.
- A 21 km × 13.5 km design extent for the compressed first-world layout.
- A spatial anchor for each of the 12 playable districts plus the Greater Accra root region.
- Coordinates for every primary-road network node.
- A stylised southern coastline guide.
- Centreline guide paths for every current primary-road segment, with exact endpoint matching to its network nodes.
- Explicit flags that keep the Nsawam and Prampram expansion stubs outside the first-release playable road network.

The layout exports lookup helpers and `isGreaterAccraMapLayoutValid()`, which checks complete region/node/segment coverage, unique IDs, coordinate bounds, finite points, and road-path endpoints against the network graph.

These coordinates are **game-layout approximations** intended to preserve the agreed west/centre/east and north/south relationships. They do not claim exact GPS positions, administrative boundaries, surveyed shoreline, legal road alignments, engineering levels or real travel distances. District street grids, junction footprints, interchanges, ramps, coastline terrain, beach shapes and 3D road meshes are not generated yet. The current 180 m Babylon preview is also not yet resized or replaced by this larger layout.

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

The bridge/overpass catalogue is currently empty by design. No bridge or flyover is placed based on guesswork. During the geography and road-layout stage, actual crossings will be identified and added with their connected road segments.\n\n`apps/game/src/world/junctionLayouts.ts` now reserves provisional spatial envelopes for the eight major junctions in the shared Greater Accra coordinate system. Each reservation is anchored to its existing road-network node and checked against the map bounds. These are game-layout allowances only—not surveyed footprints, final ramp designs or official engineering dimensions. The next geometry pass must shape each junction around its real approach paths and keep pedestrian crossings and public-transport stops away from unsafe conflict points.

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
| Urban expressway | N1 / N6 primary highway sections | 24.5 m |
| Major urban arterial | N4, Liberation, Ring Road, Spintex | 20.5 m |
| Urban collector | Smaller connecting roads | 12.0 m |
| Local street | Neighbourhood streets | 10.2 m |
| Rural connector | Future outer-corridor sections | 9.7 m |
| Unpaved access road | Selected low-speed access routes | 7.6 m |

Total width is calculated from the component dimensions rather than separately typed, so the displayed result stays consistent with the profile.

These are **game design targets**, not claims about actual Ghana road engineering standards or measured widths. Real sections vary along a route. At map-design time, the team can make local variations for frontage access, roadside markets, bus stops, bridges, drainage constraints and available right-of-way.

The profiles include both open side drains and covered drainage channels. They also distinguish asphalt, concrete, compacted-earth and paving-block surfaces. The unpaved profile is available for selected outskirts and access tracks, but is not assigned to the main paved highway corridors.

No visible 3D road geometry has been generated by this step. Lane markings, kerbs, sidewalks, medians, drains, shoulders and surface meshes will be built after the route alignment and junction footprints are approved.

## Babylon road-surface geometry builder

`apps/game/src/world/roadGeometry.ts` adds a reusable Babylon.js geometry builder that turns a map centreline and its assigned cross-section profile into ribbon meshes. It samples long road paths at configurable intervals and generates separate surface strips for asphalt carriageways/shoulders, pedestrian sidewalks, central medians and drainage edges. Shared materials are reused by band type to reduce duplicate material creation.

The builder exposes `createRoadSegmentGeometry()` for an individual route and `createGreaterAccraRoadGeometry()` for the first-release road catalogue. Future expansion stubs are excluded by default and can only be generated when explicitly requested. The geometry uses the existing provisional profile dimensions; it does not yet add lane paint, kerbs as separate meshes, traffic signals, signs, streetlights, junction ramps, bridges, road collision meshes or traffic behaviour.

This is a **geometry-generation foundation**, not yet the visible map in the playable game. The current Babylon preview remains a separate 180 m test scene; replacing it safely requires a larger-world streaming/chunking plan, updated spawn and movement bounds, and performance testing on mid-range phones. Junction reservations also still need dedicated approach/ramp geometry before the complete road network can be called playable.

## Road markings and traffic infrastructure catalogue

`packages/shared/src/world.ts` defines reusable specifications for road markings, traffic signals, road signs and street furniture. `apps/game/src/world/roadInfrastructure.ts` supplies the first visual catalogue:

- **Road markings:** dashed and solid lane lines, double centre lines, edge lines, stop and give-way lines, zebra crossings, directional arrows, yellow box-junction outlines and parking-bay lines.
- **Traffic signals:** three-aspect vehicle signals, pedestrian signals and directional arrow signals.
- **Road signs:** regulatory signs (stop, give way, keep left, speed limit, no entry), warning signs, destination/district direction signs, street names, bus stops and parking information.
- **Street furniture:** streetlights, pedestrian guardrails, vehicle safety barriers and bollards.

The catalogue uses stable IDs so later road sections and junctions can reference the same visual definitions. Marking widths and dash repeat length are provisional game-art dimensions, not official Ghanaian road-marking specifications. Sign artwork, exact wording, colours, dimensions and placement must be checked against appropriate Ghana road-sign guidance during the art and map stage.

These are **catalogue definitions only**. No traffic lights, signs, painted markings, barriers or streetlights have been placed in the world yet. The next implementation step is to attach infrastructure to approved road geometry and junction approaches, then generate the 3D meshes and functional signal behaviour. Signal timing, traffic rules, pedestrian crossing logic and vehicle stopping behaviour are not implemented.

## Ghana-inspired roadside environment

`packages/shared/src/world.ts` now defines reusable roadside feature and activity-zone contracts. `apps/game/src/world/roadsideEnvironment.ts` contains the first roadside asset catalogue:

- Paved pedestrian walkways and raised kerbs
- Open and covered concrete drains, plus culvert crossings
- Public bus stops and trotro boarding/alighting points
- Taxi ranks and passenger waiting shelters
- Small vendor stalls and designated street-vending frontages
- Tropical roadside shade trees
- Electricity and communications utility poles

The catalogue is intended to support different street characters. Busy commercial streets may have vendor frontages and passenger activity; residential streets should remain more open; highways need controlled access and safe stopping areas rather than random roadside stalls. Pedestrian paths must not be blocked by drains, vendors or parked vehicles.

No real-world stop, taxi rank, vendor location, tree or utility pole has been placed yet. `GREATER_ACCRA_ROADSIDE_ACTIVITY_ZONES` is deliberately empty until actual road alignments, safe stopping bays and district layouts are designed. This avoids inventing stop locations or encouraging unsafe stopping on fast roads.

Future map placement will add local variation for pavement continuity, drain crossings, roadside trading, trotro routes, taxi queues, shelters, shade, utility corridors and street frontage. Passenger boarding, vehicle queues, vendor interactions, drain water flow and pedestrian navigation are not implemented by this catalogue.

## Public transport and passenger ride experience

`packages/shared/src/world.ts` defines public-transport vehicle profiles, passenger camera modes, stops and route contracts. `apps/game/src/world/publicTransport.ts` contains the first vehicle profiles:

- Shared trotro minibus, including a future driver and mate/conductor role
- City public bus
- Intercity coach
- Shared or private taxi

### Passenger window-view requirement

When a player boards as a passenger, the default camera mode is an **interior window view**. The moving outside world must remain visible through the vehicle windows and move naturally relative to the vehicle: roads, buildings, traffic, pedestrians, trees and roadside activity should pass by as the vehicle travels.

The planned passenger camera options are:
- **Interior window:** seated passenger perspective looking through the windscreen or side windows.
- **Interior free look:** remain seated but look around the cabin and out of different windows.
- **Exterior follow:** optional outside camera following the moving vehicle.

This is a core ride-experience requirement, not a decorative video background. The vehicle, passengers, camera and exterior world must share the same movement and timing. Window frames, glass transparency/reflections, interior visibility, camera clipping and mobile performance must be handled during vehicle implementation.

Stops and routes are intentionally empty until the Greater Accra road map and safe boarding locations are approved. Route fares, stop sequences, driver/mate AI, passenger queues, boarding animations, vehicle schedules, traffic integration and actual ride cameras are **not implemented yet**. This commit establishes the data contracts and design requirements only.

## Passenger boarding, seats, fares and alighting

The shared contracts now define a passenger-trip state machine:

1. **Waiting** at the selected boarding stop.
2. **Boarded** into the vehicle.
3. **Seated** after selecting an available seat.
4. **Travelling** only after fare confirmation.
5. **Alighting** when the vehicle arrives at the selected destination stop.
6. **Completed** after the passenger exits.

A passenger can cancel before paying. A paid trip cannot be cancelled through the simple cancellation path because a refund must be explicitly handled by the future trusted economy service. Fare quotes use Ghana cedis represented as integer pesewas and are tied to a route, boarding stop and alighting stop. This avoids floating-point currency errors and prevents a fare quote from silently applying to a different journey.

The shared contracts also define reusable seat records, including optional priority seating. Seat coordinates will be authored against actual vehicle interior models later; no arbitrary seat positions or passenger capacity have been invented at this stage.

`transitionPassengerTrip` is a deterministic rules helper, not a live game interaction or a trusted payment system. The future server must independently verify vehicle proximity, route membership, stop arrival, seat availability, player identity and payment before accepting state changes. The client must never be allowed to mark its own fare as paid or award/refund money.

**Passenger camera foundation:** `apps/game/src/vehicles/passengerCamera.ts` now provides a reusable Babylon.js camera rig with an interior window view, bounded interior free-look and an exterior follow anchor. The camera inherits the live transform of the vehicle's seat or exterior anchor, allowing the real 3D world to pass naturally outside the windows. The vehicle asset must supply correctly positioned anchors and real window geometry/glass. The rig is not yet connected to a playable vehicle because the game has no drivable vehicle models or mapped stops yet.

**Not implemented yet:** boarding animations, doors, seat meshes, passenger NPCs, fare UI, CediPay/economy integration, real vehicle movement, live stop announcements and multiplayer seat reservations. These will be connected when vehicle models, map stops and the authoritative server are ready.


## Babylon road-marking geometry builder

`apps/game/src/world/roadMarkingGeometry.ts` adds a separate geometry pass for provisional road paint. It follows each first-release road centreline and its assigned cross-section profile, generating continuous carriageway-edge guides and broken lane-divider segments for multi-lane directions. The Nsawam and Prampram future expansion stubs are excluded.

The marking pass uses configurable sampling, dash length, dash gap and a small vertical offset to reduce z-fighting against the asphalt ribbons. It reuses line-system meshes and does not create a separate material per dash. The current catalogue uses restrained white paint as a visual placeholder; exact line colours, widths, patterns and placement must be reviewed against Ghana road-marking guidance and each junction's final design.

This is a **geometry builder only** and is not yet called by the playable game. It does not create stop/give-way lines, zebra crossings, arrows, box junctions, parking markings, traffic signals, signs or working traffic rules. Those need junction-specific approach geometry rather than being drawn blindly across every road centreline.


## Junction-aware road-marking termination

The road-marking geometry pass now reads the provisional junction reservation envelopes and clips ordinary lane/edge paint before it enters those reserved areas. This prevents the first road-paint pass from drawing uninterrupted lane lines straight through the planned Circle, Kaneshie, 37/Ridge, Tetteh Quarshie, Madina, Osu, Spintex and Tema junction spaces.

The clipping uses the existing game-layout reservation rectangles plus a small approach buffer. It does **not** create the junction itself, determine traffic priority, define ramp or turning movements, or place stop lines and zebra crossings. Those must be authored as junction-specific geometry once the individual approach layouts are designed. Where a road has no junction reservation at an endpoint, its paint continues to that endpoint.

This is an interim visual safeguard, not final engineering geometry. Reservation envelopes remain provisional game-space allowances and will be refined with the detailed road and junction layouts.


## Junction approach catalogue

`apps/game/src/world/junctionApproaches.ts` now derives an approach arm for every road segment connected to the eight planned Greater Accra junctions. Each arm records its junction and road IDs, outward direction from the junction, inherited road width/profile, first-release availability and whether its control concept is grade-separated or still awaiting detailed design.

The catalogue is generated from the approved road graph, map centrelines and cross-section assignments rather than duplicating coordinates by hand. Its validator checks that every connected segment has exactly one valid approach, directions are normalised, widths are positive and future expansion arms remain excluded from first-release play.

This is the hand-off layer for detailed junction geometry. It does **not** yet create ramps, lane splits, merge/diverge tapers, stop lines, traffic signals, zebra crossings or vehicle turning behaviour. Kaneshie, Circle and Tetteh Quarshie retain grade-separated concepts; the remaining junctions keep their control layout open until their detailed designs are authored. The Tema-to-Prampram arm remains a future expansion connection.


## Junction footprint reservation for road surfaces

The main road geometry builder now trims each corridor ribbon before it enters a planned junction reservation envelope, using the same provisional bounds that protect road markings. This keeps continuous asphalt, sidewalks, medians and drainage bands from being laid across the reserved spaces for Circle, Kaneshie, 37/Ridge, Tetteh Quarshie, Madina, Osu, Spintex and Tema.

The reserved areas are intentionally left for dedicated junction geometry. This is important for grade-separated locations, where a single flat road ribbon would incorrectly imply that all traffic movements share one level. At-grade junctions also need their own central paved area and approach treatment rather than overlapping road ribbons.

The current result is an intentional gap in the corridor geometry at each reserved junction, not a finished intersection. Ramps, bridges, lane connections, roundabout islands, signal-controlled stop lines and pedestrian crossings still need their own authored layouts. A 25m provisional buffer is applied outside each reservation envelope to give later junction meshes room to connect cleanly.

## Candidate junction turning movements

`apps/game/src/world/junctionMovements.ts` derives candidate vehicle movements between each distinct pair of approaches at a planned junction. It records the incoming and outgoing road segment IDs, a signed turn angle and a coarse movement class: through, left, right or U-turn.

The movement candidates are calculated from the map approach directions, so they stay connected to the current road graph instead of relying on manually duplicated turn labels. They provide a basis for later lane assignment, route navigation, signal phases and vehicle path planning.

All entries remain **planned candidates**. A generated movement does not mean that the real junction permits that turn, that a ramp or lane exists, or that a vehicle can drive it. Final junction-specific designs must remove prohibited movements and define lane groups, merging, pedestrian conflicts and traffic control. Grade-separated interchanges will need level-aware movement paths rather than treating every connection as a flat crossing.

## Kwame Nkrumah Circle — research-informed interchange concept

`apps/game/src/world/circleInterchange.ts` records the three elevated corridor connections and the ground-level roundabout:

- Akasanoma Road to Nsawam Road
- Nsawam Road to Kwame Nkrumah Avenue
- Ring Road Central to Ring Road West
- Ground-level roundabout at the existing Circle


### Circle approach-corridor reconciliation

The Circle catalogue now separately names five corridors that must be reconciled before bridge geometry is authored: Akasanoma Road, Nsawam Road, Kwame Nkrumah Avenue, Ring Road Central and Ring Road West. The records connect the three reported flyover links to their named corridors and preserve the ground-level connection requirement.

This is an explicit correction to the simplified primary-road graph: Ring Road West must not be treated as the same road as the N1 western approach, and the Circle-side Nsawam Road approach must not be confused with the distant future Nsawam/Kumasi expansion gateway. The current graph does not yet represent all five as distinct mapped arms.

All five corridor records therefore remain marked **not yet mapped**. No local coordinates, route geometry, road widths, ramp paths or level assignments have been invented. The next spatial pass must reconcile these corridors against the surrounding Kaneshie, Circle, Accra Central and Ring Road layout before any viaduct or ground-level junction mesh is built. The catalogue validator checks that each corridor refers only to one of the three known elevated links.


### Circle site constraints for the next geometry pass

The Circle concept now also records three site constraints that affect how the elevated Ring Road must be built:

- **Odaw River:** the Ring Road flyover passes over the river corridor; preserve the channel and maintenance access.
- **Railway:** the elevated road must clear the rail corridor; exact span locations and vertical clearances still require reliable survey/design information.
- **Ground-level access:** retain usable pedestrian and public-transport space below/alongside the elevated road, with separate safe links to the transport terminals.

These constraints come from the original project description, which states that the Ring Road flyover lifts the Ring Road above both the Odaw River and the rail line to allow pedestrian and public-transport operations at ground level. They are not coordinates, structural drawings or engineering clearance values. The geometry stage must not guess those values.

Reference: [Graphic Online — Work on Nkrumah Circle interchange begins](https://www.graphic.com.gh/news/general-news/work-on-nkrumah-circle-interchange-begins.html). The report also describes the ground-level roundabout and the two first-level flyover movements.


### Separate vertical levels at Circle

The Circle flyover links now record their distinct design levels instead of using one generic “elevated” label:

| Level | Movement |
|---|---|
| Ground | Existing Circle roundabout and local access |
| First elevated level | Akasanoma Road → Nsawam Road |
| First elevated level | Nsawam Road → Kwame Nkrumah Avenue |
| Second elevated level | Ring Road Central → Ring Road West |

This follows the project description, which identifies the Akasanoma/Nsawam and Nsawam/Nkrumah Avenue flyovers as the first level, and the Ring Road Central–Ring Road West flyover as the second level. The Ring Road structure also crosses above the Odaw River and railway corridor.

The level labels are relative design layers, not surveyed deck heights. We have not assigned metres-above-ground values, gradients, ramp start/end points or vertical curves. The next geometry work must keep these three layers separate and connect them with researched approach paths rather than flattening the interchange into one surface.

### Structural reference dimensions

The catalogue also records dimensions published by structural consultant FHECOR in its 2016 Dr. Kwame Nkrumah Interchange project sheet:

| Structure | Reference length | Deck width |
|---|---:|---:|
| Ring Road main viaduct | 925 m | 24.0 m |
| Ramp down at Feo Oyeo | 141.5 m | 6.50 m |
| Ramp up at Feo Oyeo | 143 m | 6.50 m |
| Loop viaduct | 323 m | 9.20 m |
| Akasanoma viaduct | 168.3 m | 9.20 m |
| Nsawam viaduct | 167.8 m | 9.20 m |
| Bridge 1 | 34.5 m | 11.65 m |
| Bridge 2 | 34.5 m | 18.15 m |
| Bridge 3 | 35.2 m | 12.30 m |

Source: [FHECOR — Dr. Kwame Nkrumah Interchange, Accra (2016)](https://www.fhecor.com/multimedia/proyectos/file/000000005000/Enlace%20Dr.%20Kwame%20Nkrumah_5238.pdf). The corridor relationships are also described by [Graphic Online](https://www.graphic.com.gh/news/general-news/kwame-nkrumah-circle-interchange-project-progresses.html), and the two first flyovers' routes were reported at their 2015 opening [here](https://www.graphic.com.gh/news/general-news/mahama-inaugurates-phase-one-of-nkrumah-circle-flyovers.html).

These are **consultant-published structural reference dimensions**, not a complete surveyed model or a claim that each listed structure is a separate corridor. They do not supply our game's local coordinates, full horizontal/vertical alignments, exact pier positions, deck levels at every point, collision geometry, current road rules or pedestrian paths. The current simplified primary-road graph and map centrelines still need to be reconciled with the named approaches before connected 3D construction.

No playable ramps, bridge meshes, support columns, barriers, collision surfaces, roundabout island, pedestrian crossings or vehicle navigation are created by this catalogue. The next Circle stage is to map the approach corridors and structure alignments, then build separate ground-level and elevated road surfaces.
