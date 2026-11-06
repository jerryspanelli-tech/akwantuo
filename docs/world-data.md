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



### Circle corridor directions checked against the CBD–Amasaman route

The corridor records now distinguish the **CBD approach via Akasanoma Road**, the **northern Nsawam Road**, and the **southern departure via Kwame Nkrumah Avenue**. This avoids assigning Akasanoma Road an unsupported west-side compass direction.

A World Bank project report describes the northbound CBD–Amasaman route travelling from Tudu via Kojo Thompson Road and entering Circle through Akasanoma Road before continuing north on Nsawam Road. Its return route comes south on Nsawam Road and leaves Circle via Kwame Nkrumah Avenue toward Tudu. This supports the route relationship, but not exact in-game coordinates or surveyed centre-lines.

Reference: [World Bank — Accra CBD–Amasaman corridor project report](https://documents.worldbank.org/curated/en/276331468251734905/pdf/RP5130V40P10060Box391429B00PUBLIC0.pdf).




### Reusable elevated-road 3D geometry builder

Added `apps/game/src/world/elevatedRoadGeometry.ts` with `createElevatedRoadGeometry(scene, options)`. It builds a deck surface, underside, side fascia, two guardrails and optional support columns from an explicitly supplied 3D centreline.

The caller must supply the deck width, deck thickness, ground datum and any support-station distances. The builder validates finite coordinates, positive dimensions, valid support stations and deck clearance above the configured ground datum. It does **not** guess support positions or create ramp alignments.

This is a geometry utility only. It is not yet used by the playable scene and no Circle flyover mesh has been placed. The Circle-specific centre-lines, elevations and safe pier stations must be authored from the local site layout before calling this builder. Mesh collision and vehicle physics integration remain separate work.


### Circle flyover directionality

The two first-level connections are recorded as separate **one-way directional links**: Akasanoma Road toward Nsawam Road, and Nsawam Road toward Kwame Nkrumah Avenue. This reflects the reported opposite-direction movements and prevents the game from treating them as one undirected two-way ramp.

The Ring Road Central–Ring Road West viaduct is kept as directionality **not confirmed** in the catalogue. Its published structural width is recorded separately, but width alone is not used to invent lane direction or traffic rules. Vehicle lane paths and permitted movements remain to be authored from verified road references.

### Circle site anchors and ground-level access

A ten-item site-anchor catalogue now captures the important named features that must be preserved when the interchange area is modelled:

- **Building landmarks:** Vodafone building, GCB Tower and Ernest Chemists building.
- **Transport terminals:** Neoplan Station, STC terminal and VIP Transport Terminal.
- **Pedestrian space:** Circle Pedestrian Shopping Mall.
- **Infrastructure constraints:** Odaw River and the railway corridor.
- **Local access:** Otublohum roads connecting Nsawam Road with the Pedestrian Mall.

These references come from historical project descriptions and an urban-area overview. They are not a current survey: the catalogue deliberately stores no invented coordinates, building footprints, gate positions or present-day operating status. Before generating the local 3D block, each anchor must be placed against a current map/reference image and checked for changes.

The ground-level design must preserve the transport terminals, pedestrian shopping area, local road access, river channel and railway reservation. It must not place flyover supports through terminal footprints or block pedestrian routes. The site-anchor catalogue is a design hand-off only; no terminal, building, river, rail or pedestrian-mall meshes have been created yet.

References: [Graphic Online — Circle interchange construction and site constraints](https://www.graphic.com.gh/news/general-news/odaw-river-bridge-to-be-demolished-to-pave-way-circle-interchange.html); [Modern Ghana — Circle landmarks and lorry terminals](https://www.modernghana.com/news/500060/kwame-nkrumah-reborn-as-urban-roads-delivers-interchange.amp); [Modern Ghana — local access roads and pedestrian mall connections](https://www.modernghana.com/news/477181/work-on-nkrumah-circle-interchange-begins.html).

### Circle through-movement continuity

The Circle catalogue now records three named through-movements as ordered corridor sequences:

1. **Northbound CBD–Amasaman:** Tudu → Kojo Thompson Road → Akasanoma Road → Circle → Nsawam Road → Achimota → Ofankor → Amasaman.
2. **Southbound Amasaman–CBD:** Amasaman → Ofankor → Achimota → Nsawam Road → Circle → Kwame Nkrumah Avenue → Tudu.
3. **Ring Road westbound:** Ring Road Central → Circle → Ring Road West.

The first two follow the route descriptions in the World Bank CBD–Amasaman corridor report; the Ring Road connection follows the Circle interchange project description. The movement catalogue ties each sequence to its correct first- or second-elevated level. These are named topology references, not drivable splines: intermediate street coordinates, turn geometry, lane paths, ramp gradients and ground-level local access remain to be designed.

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


### Circle ground-level roundabout geometry utility

Added `apps/game/src/world/circleGroundGeometry.ts` with `createCircleGroundGeometry(scene, options)`. It builds a circular asphalt surface, a raised central island, a kerb ring and optional radial approach-road meshes. The approach arms are opt-in and require explicit bearings, widths and lengths from a reviewed local layout; the utility does not guess their positions.

This is the first Circle-specific ground-level mesh builder, but it is not yet integrated into the playable world. No real-world dimensions have been inferred from the historical reports, and no Circle approach arms are currently supplied. The ground-level roundabout is reported in the project descriptions, while the exact island dimensions, approach angles and current traffic controls still need map/reference review. The utility also does not create lane markings, pedestrian crossings, signs, traffic signals, collision meshes or vehicle navigation.

Reference for the existence of the ground-level roundabout and its relationship to the elevated links: [Graphic Online — Work on Nkrumah Circle interchange begins](https://www.graphic.com.gh/news/general-news/work-on-nkrumah-circle-interchange-begins.html).


### Circle ground-level local access routes

Added `apps/game/src/world/circleGroundAccess.ts` to preserve three reported ground-level route relationships:

1. **Feo Oyeo → Dadeban Road → Abotia Street → Otublohum Road → Obibini Street → Nsawam Road**, described in a 2023 World Bank project document as an alternative local route from the Circle roundabout to Nsawam Road.
2. **Nsawam Road → Otublohum local roads → Circle Pedestrian Shopping Mall**, identified in the interchange project description as a local-access connection.
3. **Ring Road East → Feo Oyeo intersection → Ring Road West**, identified as a road-improvement connection in the Circle project description.

These are named connectivity references, not surveyed street centre-lines or confirmed current traffic directions. They give the local map a better ground-level access structure around the interchange and prevent the area from being represented only by its flyovers. Exact geometry, street widths, pedestrian crossings, terminal gates and current access restrictions still need map review.

References: [World Bank project document (2023)](https://documents1.worldbank.org/curated/en/099110323104036687/pdf/P164330083329e040882900109f67ec4fc.pdf); [Graphic Online — Circle interchange project](https://www.graphic.com.gh/news/general-news/work-on-nkrumah-circle-interchange-project-progresses.html).


### Circle ground-level spatial prototype

Added `apps/game/src/world/circleInterchangeGroundLevel.ts`. It anchors the ground-level roundabout to the existing `circle-junction` point in the Greater Accra map and provides a scene builder for a circular asphalt surface, raised central island, kerb ring and six approach arms: N1 west, N1/Tema east, Nsawam Road, Kwame Nkrumah Avenue, Ring Road West and a Feo Oyeo connection.

The first prototype uses a 58 m outer radius, 18 m island radius, 14–18 m approach widths and 150 m approach lengths. **These are provisional game-layout values, not surveyed Circle dimensions.** Approach bearings are illustrative so we can test spatial composition and later replace them with reviewed alignment data. The approach meshes overlap the roundabout perimeter slightly to avoid visible seams.

This builder is not yet called by the playable scene. It creates non-pickable, non-colliding visual meshes only. It does not yet create the elevated flyovers, local street splines, lane markings, traffic signals, pedestrian crossings, bridge/rail/river crossings, vehicle paths or collision meshes. The roundabout's existence is supported by the Circle project descriptions; the numeric dimensions and bearings are prototype assumptions for the game.


The Circle ground-level prototype now also generates visual lane guidance: inner/outer circulating-road edge lines, a dashed circulating-lane divider, dashed approach centre lines and stop lines at each approach. These are presentation guides only. They are not approved local traffic-control markings and currently have no vehicle, pedestrian or signal behaviour behind them.


### Circle elevated viaduct 3D layout prototype

Added `apps/game/src/world/circleInterchangeElevatedLayout.ts` and the combined `createCircleInterchangeGeometry(scene)` entry point in `apps/game/src/world/circleInterchangeGeometry.ts`. The layout now has visual 3D deck, underside, fascia, guardrail and support geometry for four principal structures:

| Structure | Reference length | Reference deck width | Prototype supports |
|---|---:|---:|---:|
| Ring Road main viaduct | 925 m | 24.0 m | 24 intermediate support stations across 25 spans |
| Akasanoma viaduct | 168.3 m | 9.2 m | 4 intermediate support stations across 5 spans |
| Nsawam viaduct | 167.8 m | 9.2 m | 4 intermediate support stations across 5 spans |
| Loop viaduct | 323 m | 9.2 m | 9 intermediate support stations across 10 spans |

The lengths, widths and span counts are transcribed from FHECOR's 2016 detailed-design project sheet. The main Ring Road deck is represented as a diagonal second-level structure, with the Akasanoma, Nsawam and loop decks at a lower provisional level. Support stations are evenly distributed from the reported span counts for the game prototype; they are not claimed to be the real pier coordinates.

The 2023 aerial photograph is used only as a visual orientation reference for the broad diagonal viaduct and loop composition. The published project description identifies the Ring Road flyover between Fanofa Bridge and Feo Oyeo, connecting Ring Road Central to Ring Road West, and says it crosses the Odaw River and railway. The current local paths, heights, curve shapes, support sizes and exact crossing positions remain provisional. The geometry builder does not yet create the three single-span bridges, Feo Oyeo ramps, exact river/rail alignments, road approaches to the decks or traffic connections.

The combined builder is **not yet called by the playable scene**. It produces visual-only Babylon meshes; collision, drivable surfaces, navigation, lane rules, traffic signals and vehicle movement are still separate work.

References:
- [FHECOR — Dr. Kwame Nkrumah Interchange (2016 detailed design)](https://fhecor.com/proyecto.php?id=345)
- [Graphic Online — Odaw River bridge and interchange layout description](https://www.graphic.com.gh/news/general-news/odaw-river-bridge-to-be-demolished-to-pave-way-circle-interchange.html)
- [2023 aerial view of Kwame Nkrumah Interchange, Wikimedia Commons, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Circle_the_Wonderland.jpg)


### Standalone Circle 3D developer preview

Added `apps/game/circle-preview.html` and `apps/game/src/circlePreview.ts`, included as a second Vite build entry. The page renders the current Circle geometry package with an orbit camera, lighting, ground plane and mobile touch/pinch controls. It is a developer inspection page, not the main game menu or a production game mode.

After running the game workspace locally, open `/circle-preview.html` to inspect the roundabout and four elevated structure meshes. This preview makes it possible to review proportions and visual intersections before any attempt to merge the 21 km Greater Accra layout into the current 180 m playable prototype.


### Feo Oyeo ramp geometry prototype

The Circle elevated-structure builder now includes two Feo Oyeo ramp meshes: the ramp down (141.5 m) and ramp up (143 m), each using the published 6.5 m deck width. Both are generated through the reusable elevated-road builder with deck, underside, fascia and guardrails.

The reference lengths and widths come from FHECOR's 2016 project sheet. The local endpoints, orientation, spacing and 7.5 m vertical change are **provisional visual-design assumptions** because the reference sheet does not provide a georeferenced centreline in the data currently available. These are not surveyed gradients, approved road levels or engineering designs. No support columns are added to these ramps, and they are not yet connected to the main viaducts or ground roads as drivable surfaces.

The Circle developer preview now contains six elevated visual structures in total: four principal viaducts plus these two Feo Oyeo ramps. Traffic, collision and navigation remain unimplemented.


### Circle local ground-access road geometry prototype

Added a separate local-access geometry layer matching the three named topology references: Feo Oyeo–Dadeban–Abotia–Otublohum–Obibini toward Nsawam Road, a pedestrian-only Otublohum path toward the Circle Pedestrian Shopping Mall, and a Ring Road East–Feo Oyeo–Ring Road West connection.

The 3D preview now draws two provisional asphalt access roads and one pedestrian-paved access path. The road and path widths, waypoint positions, bends and exact relationships to the interchange are game-layout assumptions, not surveyed centre-lines or verified current traffic directions. The mall connection is pedestrian-only in this prototype. These surfaces have no collision, traffic rules, navigation or vehicle routing yet.

The geometry is deliberately kept in a separate module so its provisional coordinates can be replaced after site-layout review without changing the named route references.


### Circle Odaw River and railway corridor visual prototype

Added `apps/game/src/world/circleRiverRailGeometry.ts` and connected it to the standalone Circle developer preview. It creates a distinct shallow channel bed, water surface and banks for a schematic Odaw River corridor, plus a railway ballast bed, two steel rails and regularly spaced sleepers.

The river and railway are represented as separate corridor reservations so the Circle scene can be reviewed as more than elevated road decks alone. The river path, widths, water level and offset from the railway are **provisional visual placeholders**. The track gauge has been corrected to **1,067 mm Cape gauge**, matching the existing Accra–Tema / Accra–Nsawam Eastern Line described by Ghana's Ministry of Finance PPP Portal and the Greater Accra spatial framework. The preview uses simplified 1.5 m sleeper spacing for visual readability, not a construction specification. They are not surveyed, georeferenced or claims about exact present-day channel or railway alignment. The prototype intentionally does not change viaduct pier stations because the available references do not establish safe, exact pier coordinates.

The geometry is visual-only: it has no water simulation, railway vehicles, track collision, train schedules, maintenance access logic or vehicle navigation. Before treating the corridors as map truth, align them with current reliable site imagery/survey data and review every elevated-road support against the actual river and railway reservations. The 1,067 mm gauge reference does not establish the track's exact alignment or current operational condition.


## Greater Accra rail network — first topology pass

Added `apps/game/src/world/railNetwork.ts` to represent the Greater Accra portion of the Eastern Railway Line separately from the road graph.

The route structure follows the documented branch relationship:

- **Accra Central → Odaw / Circle → Achimota:** the provisional urban trunk through the Circle area.
- **Achimota → Tema:** the eastern branch toward Tema.
- **Achimota → Nsawam:** the northbound Eastern Line corridor, marked as a future expansion gateway beyond the first-release playable area.

The important geography correction is that the Tema branch is associated with **Achimota**, not a fork at Odaw/Circle. Ghana's Ministry of Finance PPP project description identifies the Eastern Railway Line as Accra–Kumasi with a branch from Achimota to Tema, and records the Accra–Nsawam and Accra–Tema sections as the commuter corridors. The same source records the existing line gauge as 1,067 mm.

The route catalogue includes stable node and route IDs, schematic map-space centre-lines, first-release flags and a validator. The Odaw/Circle point is deliberately a provisional rail-corridor marker, not confirmation of a current station, platform, service or exact track location. The Tema station anchor and all intermediate bends are also game-layout approximations. The Nsawam corridor remains outside the first playable map.

This is a **topology and map-data foundation only**. It does not create physical rails across the Greater Accra map, station buildings, platforms, signals, train vehicles, timetables, collision, passenger boarding or train movement. Detailed track placement must be reviewed against current reliable mapping before being rendered as final geography.

References:
- [Ministry of Finance PPP Portal — Eastern Railway Line Project](https://ppp.mofep.gov.gh/project/69/eastern-railway-line-project)
- [Ghana Railway Company Limited — network history](https://grcl.gov.gh/about.php)


## Ultra-modern Greater Accra railway station design standard

Added `apps/game/src/world/railStations.ts` as the first station-design catalogue. AKWANTUO railway stations are intended to be **ultra-modern Ghanaian public buildings**, with a recognisable contemporary identity rather than generic old-fashioned sheds.

The shared architectural brief includes:
- contemporary façades combining glass, durable materials and shaded public edges;
- a spacious, naturally lit passenger concourse with clear sightlines;
- deep weather-protective platform canopies and rainwater management;
- step-free circulation, lifts or ramps, tactile guidance and accessible facilities;
- efficient lighting, CCTV-monitored public areas and staffed assistance;
- digital departure/arrival boards and audio announcements;
- ticket offices, self-service kiosks and future-ready fare-gate provision;
- toilets, first aid, seating, drinking water and retail/food concessions;
- organised taxi, ride-hailing, bus/trotro and pedestrian access.

Station identities:
- **Accra Central:** flagship city terminal, with a civic-scale entrance, generous concourse and intercity-ready passenger facilities.
- **Achimota:** major interchange station, designed around clear transfers between the Tema branch and the northbound Eastern Line corridor.
- **Tema:** modern regional station with a protected forecourt and local transport connections.
- **Circle / Odaw:** candidate urban stop only. Its exact station status and location are not verified, so it must not be presented as a confirmed operating station.

The catalogue intentionally leaves platform counts, platform arrangement, track spacing, station footprints and exact entrances unassigned until verified railway/site information is available. These are design requirements, not completed 3D station buildings. No station meshes, train services, ticketing interactions, passenger AI or operational timetable have been implemented yet.

The station catalogue includes a validator and lookup helpers so later station geometry, passenger navigation and train operations can use stable IDs without inventing site details.


## Ultra-modern railway station 3D massing prototype

Added `apps/game/src/world/railStationGeometry.ts`, a reusable Babylon.js geometry builder for the agreed ultra-modern station direction. It can create a large glazed passenger concourse, broad roof, structural façade fins, a prominent warm-metal entrance portal, a deep shaded entrance canopy, raised platforms, tactile platform-edge strips, platform canopies and solar-roof accents.

The builder accepts explicit map position and provisional dimensions, and returns the created mesh groups separately so later work can add lighting, signage, interior fit-out, passenger navigation, track geometry and collision in controlled layers. It does not automatically place stations at the current approximate rail-node coordinates.

Default dimensions are only a **visual massing prototype**. Platform count, platform arrangement, track spacing, heights, roof spans, structural systems, fire exits, evacuation capacity and accessible circulation must be reviewed against a verified site plan and railway engineering requirements before a station is treated as final.

The builder is not yet integrated into the playable game or a standalone station preview. It creates visual meshes only; no trains, tracks, passenger systems, station services, collision or interactive ticketing are included.


### Standalone ultra-modern station developer preview

Added `apps/game/station-preview.html` and `apps/game/src/stationPreview.ts`, with matching preview styling and a Vite build entry. This developer page renders the reusable station massing prototype with an orbit camera, zoom and touch controls. Open `/station-preview.html` while running the game workspace to inspect the concept.

The preview shows one generic flagship-scale station concept to review the visual direction. It is not yet an Accra Central, Achimota or Tema site-specific reconstruction, and it is not part of the playable game menu or deployed game.


## Railway passenger concourse fit-out prototype

Added `apps/game/src/world/railStationFitout.ts` and integrated it into the standalone station preview. The passenger-facing concept now includes:
- a large live-departure information board with row/status indicators;
- self-service ticket kiosks with screen and payment-reader details;
- tall wayfinding pylons and a platform-direction sign;
- modular waiting benches;
- visual fare-gate lanes and a staffed passenger-help desk;
- interior planters to soften the concourse while retaining a central circulation area.

These are static Babylon.js visual meshes. The displays do not yet show live train data, kiosks do not sell tickets, fare gates do not validate passes, and no passenger AI or station security logic is connected. The current arrangement is a visual composition for the generic preview, not a final circulation or evacuation plan. All positions must be reviewed against an approved station layout before site-specific use.


## Railway station passenger circulation model

Added `apps/game/src/world/railStationCirculation.ts` to define passenger movement through station forecourts, entrances, ticketing, concourses, accessible circulation, platforms, boarding areas and interchange spaces. The catalogue creates stable station-specific zone IDs, planned connections, access-control classifications and step-free route requirements. It also records a planned accessible egress connection from each public passenger zone back to a designated safe-area zone.

This is a route-planning foundation for later wayfinding, passenger NPC navigation, ticket checks and emergency systems. It does **not** certify fire egress, evacuation capacity, accessibility compliance or building-code compliance. It contains no final corridor widths, stair dimensions, lift locations, gradients, exit doors or crowd simulation; those must be designed from verified station plans and applicable standards.


## Greater Accra railway track geometry prototype

Added `apps/game/src/world/railTrackDesign.ts` and `apps/game/src/world/railTrackGeometry.ts`. The design catalogue assigns the documented **1,067 mm Cape gauge** to the schematic Accra–Odaw–Achimota trunk and Achimota–Tema branch, while keeping the Achimota–Nsawam corridor excluded from first-release geometry.

The Babylon.js builder creates:
- a ballast bed following each route centreline;
- two steel rail tubes offset to the 1,067 mm gauge;
- timber-coloured sleeper visuals distributed along the track;
- thin-instanced sleepers so long routes do not create a separate Babylon mesh for every sleeper.

The current track dimensions, sleeper spacing, rail profile, elevations and intermediate route bends are simplified visual-design targets, **not railway construction specifications or surveyed track alignments**. The route catalogue itself remains schematic. The builder is reusable but is not yet integrated into the main playable world or a dedicated railway preview.

This stage does not implement points/switches at Achimota, signals, level crossings, overhead electrification, train vehicles, train movement, collision, track maintenance, timetables or station-specific platform-track layouts. Those must be designed as separate layers after reliable alignment and station-site review. The Circle Odaw railway corridor preview remains its own schematic local visual and is not automatically joined to this wider track builder.


## Railway station platform access geometry foundation

Added `apps/game/src/world/railStationAccessGeometry.ts` as a reusable Babylon.js builder for four configurable station access types:

- **Accessible ramps:** sloped deck, side handrails and a tactile landing marker.
- **Stairs:** individually modelled tread geometry and a tactile landing marker.
- **Lifts:** glazed shaft, visual lift cab and roof cap.
- **Sheltered walkways:** paved connection, weather canopy and support posts.

The builder requires explicit start/end coordinates and dimensions for every connection. It does not assume where Accra Central, Achimota or Tema platforms, lifts, stairs or entrances will sit. This lets a later reviewed station-site layout provide the exact connection data without embedding guessed positions in shared geometry code.

These meshes are visual prototypes only. They do not establish compliant ramp gradients, stair risers/treads, lift capacity, fire strategy, structural design, tactile standards or accessible-route certification. Those details must be checked against applicable Ghanaian requirements and the approved station design. No station-specific access links have been placed yet, and this module is not integrated into the generic station preview or playable world.


## Railway station public-transport interchange

Added `apps/game/src/world/railStationInterchange.ts` as the station-to-city transport service catalogue. Each planned first-release station has explicit interchange service briefs for:

- trotros and city buses;
- taxi ranks and ride-hailing pickup;
- private-vehicle drop-off and pickup;
- pedestrian access and bicycle access/parking.

The catalogue requires clear separation between pedestrians and moving vehicles, sheltered waiting, visible wayfinding, step-free station connections and unobstructed emergency access. It intentionally does not invent bay counts, traffic capacity, exact station forecourt positions or local road connections. Those need a station-specific site layout.

Added `apps/game/src/world/stationInterchangeGeometry.ts`, a configurable Babylon.js forecourt builder. It can create a marked vehicle forecourt, protected pedestrian island, shelter structures, pickup-bay markings, pedestrian crossing and representative parked-vehicle placeholders from explicitly supplied bay coordinates. These are visual meshes only; there is no vehicle routing, queue simulation, boarding logic, collision or traffic control.

A generic interactive 3D preview is available at `/transport-preview.html` in the Vite game workspace. It combines the ultra-modern station concept with a sample trotro, city-bus, taxi and ride-hailing forecourt. The sample coordinates and dimensions are illustrative only and are not assigned to Accra Central, Achimota or Tema. This developer preview is separate from the main playable game and is not deployed.


## Ghana road-vehicle content catalogue

Added `apps/game/src/vehicles/roadVehicles.ts` to define the first road-vehicle families and their gameplay roles. The catalogue covers private cars, shared/private taxis, trotros, city buses, motorcycles, delivery vans, rigid goods trucks, ambulances and police patrol vehicles. Intercity coaches and articulated freight trucks are reserved for later expansion.

Each profile records a gameplay passenger-capacity target, driver/conductor roles, traffic role and shared model requirements for lights, wheel contact, collision alignment, cabin entry points and mobile-friendly detail. Passenger capacities are provisional gameplay targets, not certified seating capacities or legal vehicle specifications.

This is a content catalogue only. It does not contain 3D vehicle assets, driving physics, AI traffic, vehicle ownership, damage, fuel, licences, emergency dispatch or multiplayer synchronisation. Those systems must be implemented and tested separately.


The `.github/workflows/transport-preview.yml` workflow now builds this preview on relevant transport-preview changes, opens the production Vite preview in Chromium, captures a 1440 × 1000 screenshot and uploads the image together with a short scope/limitations report as the `akwantuo-transport-preview` workflow artifact. This provides a repeatable visual build check without deploying the game publicly.


## Greater Accra road-traffic gameplay baseline

Added `apps/game/src/world/trafficRules.ts` to define the initial road-traffic conventions for the Greater Accra simulation: right-hand driving, left-side overtaking where safe and permitted, counterclockwise roundabout circulation, giving way to traffic already circulating, keeping junctions clear, stopping at red signals, respecting marked pedestrian crossings, yielding to emergency vehicles and using designated public-transport stopping areas.

The rules deliberately do not assign numerical speed limits or assume that a road class automatically determines a posted limit. Posted signs, local restrictions, signal phases, lane controls and junction priority must be supplied by reviewed road-control data. This is a gameplay baseline, not a complete legal code or a live traffic simulation. No AI drivers, vehicle physics, traffic lights, collision rules or multiplayer traffic authority are implemented by this catalogue.


## Transport preview visual review update

The generic transport preview now includes a sheltered pedestrian walkway linking the station entrance to the interchange island. The parked trotro, city bus, taxi and ride-hailing placeholders have clearer low-poly silhouettes with window bands, windscreens, wheels and front lamps; the taxi also has a roof sign. These are still temporary visual placeholders, not final Ghanaian vehicle assets.

The screenshot workflow now also runs when the station-access, station-interchange, rail-track, road-vehicle or traffic-rule foundations change. It verifies the TypeScript check and production build before capturing the 1440 × 1000 Chromium preview and uploading the screenshot plus a scope report. The workflow remains a developer validation tool and does not publish the game.
