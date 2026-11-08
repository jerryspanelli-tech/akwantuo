# AKWANTUO — Greater Accra map design brief

**Status:** Design handoff draft  
**Target:** First playable Greater Accra world  
**Branch:** `design/greater-accra-map`  
**Rule:** This brief supplements the existing world-data and transport foundations. It does not replace them or claim that the city geometry is finished.

## 1. Experience target

Build a recognisable, lively Ghanaian metropolitan world—not a collection of generic blocks. The player should be able to tell when they have moved from the airport/business district to central Accra, a coastal neighbourhood, a residential suburb, a commercial corridor or Tema.

The world is geographically inspired and deliberately compressed for gameplay. Preserve the real west/centre/east and north/south relationships. Never present provisional game coordinates as GPS-accurate.

## 2. First-release geography

Keep the approved 12-area scope:

1. Airport / Airport City
2. East Legon
3. Legon
4. Madina / Adenta
5. Achimota
6. Accra Central / Makola
7. Osu
8. Labadi
9. Dansoman
10. Kaneshie
11. Spintex
12. Tema

The coastline and Gulf of Guinea remain to the south. Weija–Kokrobite, Amasaman, Dodowa and Ada Foah are useful outer-context references in the larger regional concept, but must not silently expand the first playable boundary. Nsawam and the N2/Prampram direction remain future expansion gateways.

## 3. District identity and environment direction

These are art-direction targets, not claims that every street in an area looks the same. Mix building types within each district and avoid repeating one prefab block.

| Area | Visual identity to build toward | Street-life and gameplay cues |
|---|---|---|
| Airport / Airport City | Contemporary office buildings, hotels, airport-facing commercial frontage and landscaped access roads | Business traffic, taxis, formal drop-offs, clear wayfinding |
| East Legon | Mixed modern homes, apartments, gated compounds and neighbourhood retail | Residential streets, cafés/shops, compound walls and varied setbacks |
| Legon | University-area mix of institutional buildings, student housing and everyday services | Walkable links, campus-scale open spaces, student foot traffic |
| Madina / Adenta | Dense mixed-use frontage transitioning into residential neighbourhoods | Busy shops, local transport activity, markets and smaller connecting streets |
| Achimota | Residential/commercial mix with major road infrastructure and green/open pockets | Interchange approaches, local access roads and clear separation of fast traffic |
| Accra Central / Makola | Dense commercial core, markets, older multi-storey blocks and narrow active streets | High pedestrian density, loading edges, taxis/trotros and strong street signage |
| Osu | Active mixed-use coastal urban streets with restaurants, shops and nightlife | Pedestrian activity, evening lighting, compact blocks and frontage variety |
| Labadi | Coastal recreation and hospitality character with residential edges | Beach access, hotels/leisure frontage and protected pedestrian routes |
| Dansoman | Large residential district with local commercial centres and community facilities | Neighbourhood streets, local shops, junction activity and public spaces |
| Kaneshie | Dense transport/commercial hub with market and interchange character | Bus/trotro interchange space, market frontage, pedestrian crossings |
| Spintex | Long commercial corridor mixed with workshops, retail, warehouses and residential access | Large-format frontage, service roads/access points and heavy vehicle presence |
| Tema | Planned industrial/port-city character, logistics uses and residential communities | Freight movement, industrial compounds, wide corridors and distinct town-centre areas |

**Do not** make every district uniformly dense, fill every block with skyscrapers, or place vendors randomly on high-speed roads. Use local variation, safe stopping areas, continuous pedestrian paths and realistic frontage setbacks.

## 4. Map construction layers

Build and review in this order:

1. **Land and coastline:** terrain extent, ocean edge, shoreline transitions and beach access zones.
2. **Primary network:** N1/N4/N6 and the approved urban arterial connections already represented by the road graph.
3. **Major junctions:** design each reserved junction around its actual approach paths; keep ramps, bridges and local roads connected and collision-safe.
4. **District street networks:** collectors, local streets, service/frontage roads, access lanes and dead ends. Avoid a uniform rectangular grid.
5. **Land-use blocks:** residential, commercial, institutional, industrial, recreation and open-space parcels.
6. **Landmarks and public facilities:** only after location verification; use distinct silhouettes and navigable entrances.
7. **Street-level detail:** sidewalks, drains, crossings, lighting, signs, bus/trotro stopping areas, trees, utility poles and vendors in safe designated places.
8. **Gameplay pass:** spawn points, pedestrian navigation, vehicle navigation, traffic flow, minimap labels and streaming boundaries.

## 5. Landmark placement rules

Create a landmark register before placing detailed models. Each entry must include a stable ID, verified name, area, source/reference, confidence, intended game treatment and status.

Priority categories:
- Airport and airport access
- Major interchanges and transport hubs
- Markets and commercial centres
- Stadium and major public venues
- Hospitals and police facilities
- Beaches and coastal access
- Shopping centres and major office/hotel clusters
- Industrial/port landmarks in Tema

Do not invent exact coordinates or claim a building is in a particular neighbourhood based only on a rough memory. If the exact site is uncertain, mark it **research required** and keep the model out of the final placement pass.

## 6. Road and pedestrian design requirements

- Preserve separate high-speed through lanes and local frontage access where the real corridor requires it.
- Junction approaches must connect continuously; no floating ramps, abrupt road ends or visually connected but physically disconnected meshes.
- Add safe pedestrian crossings and continuous walkable routes at district centres.
- Keep vendors, parked vehicles and passenger queues out of live high-speed carriageways.
- Give trotro stops, taxi ranks and bus stops designated safe pull-in/boarding space.
- Model open drains and culverts carefully; never let a drain sever a sidewalk without a crossing.
- Keep the future Nsawam and Prampram gateways visibly marked as expansion edges, not active first-release destinations.

## 7. Visual and performance targets

- Ghanaian metropolitan character through architecture, signage, road furniture, vegetation, markets and transport—not just flags or colour palettes.
- Use varied building silhouettes, rooflines, heights, materials and plot widths.
- Use modular building kits by district type, but avoid obvious repeated copies in nearby sightlines.
- Use instancing for repeated poles, trees, streetlights and roadside objects.
- Use GLB assets with documented source/licence, sensible texture sizes, collision proxies and LODs.
- Stream the world by district/chunk; do not load the entire metropolitan detail set at once.
- Validate on a phone-sized viewport and a mid-range-device performance budget before increasing density.

## 8. Required design deliverables

The map work is not complete when this brief is complete. The next deliverables are:

- A top-down district/blockout map with all 12 areas and the main corridors labelled.
- A junction sheet showing each major interchange/complex junction from above.
- A landmark register with evidence and placement confidence.
- A district asset matrix listing building families, road furniture, vegetation and activity density.
- A playable greybox slice connecting at least one central commercial area to a neighbouring district.
- Screenshots from the actual Babylon.js preview and a QA note covering geometry continuity, navigation, readability and phone performance.

## 9. Acceptance checklist

- [ ] North is up and the coast is south.
- [ ] All 12 approved areas appear in the correct broad relative positions.
- [ ] Future expansion is outside the first-release drivable boundary.
- [ ] Primary roads join the correct nodes and junctions have continuous approaches.
- [ ] Districts have visibly different building/street character.
- [ ] Pedestrian routes and public-transport stopping areas are safe and connected.
- [ ] Landmarks have evidence-backed placements.
- [ ] No duplicate placeholder landmark/building clusters remain.
- [ ] The scene can be explored on a phone without loading the whole detailed city at once.
- [ ] Desktop and mobile browser checks pass; physical-device checks are still required before release.

## 10. Existing implementation boundary

The repository already contains a Greater Accra coordinate/layout layer, primary road graph, provisional junction reservations, road profiles, road geometry builders and a developer transport preview. Those are foundations and previews—not proof that the complete city, district streets, final junctions, landmark placements or detailed 3D buildings are finished. The team must inspect and extend those existing systems rather than start a duplicate map implementation.
