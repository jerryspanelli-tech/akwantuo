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
| Ground approach arms | 24.5 m wide | Current game-design value, not a surveyed local measurement. Only four arms are authored in this prototype. |

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

## 5. Current gameplay blocker

The Circle geometry builder creates visual meshes only. Its own source comment says collision, navigation and vehicle route authority are not attached. The vehicle height sampler currently supports the Feo Oyeo ramps and loop, but not the main Ring Road, Akasanoma or Nsawam viaducts. The main playable ground is also a single flat ground mesh with only two subdivisions.

Therefore a road can look 3D and still not be a continuous drivable route. Before calling the interchange fixed, the implementation must:
- approve and map the game-scale alignment;
- connect each elevated deck to the correct approach roads;
- provide a continuous vehicle height/road-support path for every drivable deck and ramp;
- keep the full car footprint inside the usable deck width;
- resolve grade transitions and road/ground joins;
- test the actual driving route, not just mesh creation or deployment readiness.

## 6. What remains unverified

The public structural reference does not establish the roundabout outer diameter, central-island diameter, detailed horizontal curves, exact ramp termini, elevations, pier positions, approach geometry, or the present-day surrounding site footprints. Those must be measured from suitable mapped/aerial or engineering references before replacing the provisional game values.

Do not describe the current Circle layout as a 1:1 surveyed reconstruction. It is a visual prototype that uses several published structure dimensions but still has provisional placement and missing driving integration.
