# Circle Interchange — real-reference to game-scale audit

Status: measurement and conversion audit only. This document does not approve a final game scale or claim that the current geometry is a surveyed reconstruction.

## 1. Real-world reference dimensions

FHECOR's project record for the Dr. Kwame Nkrumah Interchange (Accra, 2016) lists:

| Structure | Real reference length | Real deck width |
|---|---:|---:|
| Ring Road main viaduct | 925.0 m | 24.0 m |
| Feo Oyeo ramp down | 141.5 m | 6.5 m |
| Feo Oyeo ramp up | 143.0 m | 6.5 m |
| Loop viaduct | 323.0 m | 9.2 m |
| Akasanoma viaduct | 168.3 m | 9.2 m |
| Nsawam viaduct | 167.8 m | 9.2 m |
| Bridge 1 | 34.5 m | 11.65 m |
| Bridge 2 | 34.5 m | 18.15 m |
| Bridge 3 | 35.2 m | 12.30 m |

Source: FHECOR, “Dr. Kwame Nkrumah Interchange”, project page and 2016 project sheet:
- https://fhste.com/proyecto.php?id=345
- https://www.ogup.cl/img/proyectos/file/000000005000/Enlace%20Dr.%20Kwame%20Nkrumah_5238.pdf

These are published structure dimensions. They do not provide the full surveyed road alignment, roundabout diameter, ramp curves, exact deck elevations, pier coordinates or all approach-road widths.

## 2. Current AKWANTUO dimensions found in source

The current branch uses metre-labelled world coordinates and a saloon-car presentation model measuring 4.35 m long by 1.82 m wide.

| Item | Current game value | Evidence / qualification |
|---|---:|---|
| Main viaduct centreline | 925 m | Two authored endpoints produce a 925 m straight 3D path; this matches the published length but is a stylised diagonal, not a surveyed alignment. |
| Main viaduct deck | 24 m wide | Taken from the FHECOR reference. |
| Akasanoma viaduct | 168.3 m | Two-point straight game path; reference length copied, position is approximate. |
| Nsawam viaduct | 167.8 m | Two-point straight game path; reference length copied, position is approximate. |
| Loop viaduct | 323 m | Constructed as a semicircular game path; actual local curve and tie-in points are not surveyed. |
| Feo Oyeo ramps | 141.5 m / 143 m | Reference lengths copied; current game profile rises 8.5 m and is a simplified straight ramp. |
| Feo Oyeo ramp deck | 6.5 m | Reference width copied. |
| Ground roundabout outer diameter | 116 m | Current prototype value (58 m radius), explicitly provisional and not measured from the real site. |
| Central island diameter | 36 m | Current prototype value (18 m radius), explicitly provisional and not measured from the real site. |
| Ground approach arms | 24.5 m wide | Current game-design value, not a surveyed local measurement. Only four arms are authored in this prototype. |\n| Bridge 1 / 2 / 3 | Reference only | Their published lengths and widths are in `circleInterchange.ts`, but the current Circle geometry builder does not create these three bridge meshes. |

Relevant source files:
- `apps/game/src/world/circleInterchangeGroundLevel.ts`
- `apps/game/src/world/circleInterchangeElevatedLayout.ts`
- `apps/game/src/world/elevatedRoadGeometry.ts`
- `apps/game/src/vehicles/roadVehicleGeometry.ts`
- `apps/game/src/world/greaterAccraPlayableWorld.ts`

## 3. Vehicle-fit comparisons

The current car body is 1.82 m wide and 4.35 m long.

At the current reference-sized deck widths:
- 24.0 m deck = about 13.19 car-body widths across.
- 9.2 m deck = about 5.05 car-body widths across.
- 6.5 m ramp = about 3.57 car-body widths across before guardrail/edge clearances.

The road-design catalogue uses 3.5 m expressway lanes and 3.25 m major-arterial lanes. A 6.5 m ramp can nominally contain two 3.25 m lanes, but the current guardrail inset reduces the clear width and the vehicle's full footprint must be included when setting its permitted lateral position.

## 4. Conversion rule for the game version

Do not assume that the game should copy every real dimension unchanged, and do not arbitrarily shrink only the road while leaving cars full size.

For a selected uniform game scale factor S:

`game length = real length × S`

`game width = real width × S`

`game elevation = real elevation × S`

The same factor must apply to the player/vehicle dimensions and other physical objects if the whole local world is scaled. Otherwise the road-to-car proportions change and the interchange can become undrivable.

Candidate scales must be compared against:
1. the actual game car footprint and turning circle;
2. lane count and safe edge clearance;
3. ramp grade and vertical transitions;
4. the space available in the Greater Accra map;
5. the connection distances to surrounding roads.

**No final S is selected in this audit.** The existing code mixes reference-sized interchange lengths with a Greater Accra map that explicitly describes itself as compressed and stylised. A single scale for the whole world cannot be claimed yet.

## 5. Game-space comparison and scale decision

The current Circle reservation in `junctionLayouts.ts` is 1,350 m wide by 1,100 m deep. The authored 925 m main-viaduct path runs from (-370, -277.5) to (370, 277.5) relative to the Circle centre.

Its calculated footprint is:
- East-west projection: 740 m, or 54.8% of the 1,350 m reserved width.
- North-south projection: 555 m, or 50.5% of the 1,100 m reserved depth.
- Diagonal centreline: 925 m, matching the published structure length.

So the current main-viaduct length does not need to be reduced just to fit the existing reserved game area. This is a comparison against the game's reserved envelope, not proof that the viaduct is in the correct real-world position. The reservation itself is a provisional planning envelope.

The vehicle model is 4.35 m long by 1.82 m wide. The playable vehicle controller also uses a 2.65 m wheelbase and a 2.25 m circular collision footprint radius. Those are the game-side constraints that the final road design must pass.

**Working scale decision for this local interchange:** retain the current metre-based physical scale for the Circle road structures and vehicle, rather than shrinking only the interchange. The available game reservation is already large enough for the published main viaduct, and narrowing decks while leaving the car unchanged would reduce safe clearance. This is a local engineering/gameplay scale decision; it does not make the overall Greater Accra map geographically 1:1. Its regional distances remain compressed and stylised.

This decision does not approve the current alignments or ground-roundabout dimensions. Those still need measured reference geometry.

### Deck-width checks against the game vehicle

- Main viaduct: 24.0 m deck; approximately 13.2 car-body widths across before barriers and edge clearances.
- 9.2 m viaducts: approximately 5.1 car-body widths across before barriers and edge clearances. Their lane layout still needs to be mapped from reliable visual/engineering references.
- 6.5 m Feo Oyeo ramps: approximately 3.6 car-body widths across before barriers. With the current 0.25 m guardrail inset on each side, the nominal between-inset width is 6.0 m. A 4.5 m-wide collision footprint leaves 1.5 m total, or 0.75 m each side when centred.

Do not assume that a 6.5 m deck is two lanes simply because two 3.25 m lane widths add up to 6.5 m: that leaves no allowance for barriers or edge clearance. Treat it as a single controlled carriageway until lane markings and the engineering drawing establish otherwise.

### Span-spacing cross-check

FHECOR also publishes span counts and maximum span lengths:
- Main viaduct: 25 spans, maximum span 41 m. Average span from total length: 925 / 25 = 37.0 m.
- Loop: 10 spans, maximum 41 m. Average: 323 / 10 = 32.3 m.
- Akasanoma: 5 spans, maximum 41 m. Average: 168.3 / 5 = 33.66 m.
- Nsawam: 5 spans, maximum 40 m. Average: 167.8 / 5 = 33.56 m.

The current game code spaces its provisional support stations evenly using these span counts, so its average spans are consistent with the published totals and below the published maximums. This is a useful dimensional check, but it does not establish the real pier locations or structural design.

Source: FHECOR project description and project sheet:
- https://fhste.com/proyecto.php?id=345
- https://www.fhecor.com/multimedia/proyectos/file/000000005000/Enlace%20Dr.%20Kwame%20Nkrumah_5238.pdf

## 6. Current gameplay blocker

The Circle geometry builder creates visual meshes only. Its own source comment says collision, navigation and vehicle route authority are not attached. The vehicle height sampler currently supports the Feo Oyeo ramps and loop, but not the main Ring Road, Akasanoma or Nsawam viaducts. The main playable ground is also a single flat ground mesh with only two subdivisions.

Therefore a road can look 3D and still not be a continuous drivable route. Before calling the interchange fixed, the implementation must:
- approve and map the game-scale alignment;
- connect each elevated deck to the correct approach roads;
- provide a continuous vehicle height/road-support path for every drivable deck and ramp;
- keep the full car footprint inside the usable deck width;
- resolve grade transitions and road/ground joins;
- test the actual driving route, not just mesh creation or deployment readiness.

## 7. What remains unverified

The public structural reference does not establish the roundabout outer diameter, central-island diameter, detailed horizontal curves, exact ramp termini, elevations, pier positions, approach geometry, or the present-day surrounding site footprints. Those must be measured from suitable mapped/aerial or engineering references before replacing the provisional game values.

Do not describe the current Circle layout as a 1:1 surveyed reconstruction. It is a visual prototype that uses several published structure dimensions but still has provisional placement and missing driving integration. It also omits the three separately listed single-span bridges (Bridge 1, Bridge 2 and Bridge 3) from the current visual build; their dimensions are catalogue references only. The FHECOR PDF's headline describes seven viaducts in total, while its detailed list names the main viaduct, two Feo Oyeo ramps, Loop, Akasanoma and Nsawam, plus three single-span bridges. Keep this source wording visible rather than silently guessing how the headline count is reconciled.
