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
